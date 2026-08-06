import { db } from "@/db";
import { orders, reviews, riderLocations, users } from "@/db/schema";
import { and, desc, eq, gte, inArray, lt, or } from "drizzle-orm";
import { notifyOrderStatus } from "@/lib/notifications";
import { sendWhatsAppTemplate, logNotification, sendSms } from "@/lib/notifications";
import { normalizePhone } from "@/lib/utils";

export interface NotifyOrderPayload {
  orderId: string;
  orderNumber: string;
  customerPhone: string;
  customerEmail?: string | null;
  userId?: string | null;
  status: string;
  etaMinutes?: number | null;
}

export async function handleNotifyOrder(payload: NotifyOrderPayload) {
  await notifyOrderStatus({
    orderId: payload.orderId,
    orderNumber: payload.orderNumber,
    customerPhone: payload.customerPhone,
    customerEmail: payload.customerEmail ?? null,
    userId: payload.userId ?? null,
    status: payload.status,
    etaMinutes: payload.etaMinutes ?? null,
  });
}

export interface ReviewRequestPayload {
  orderId: string;
  orderNumber: string;
  customerPhone: string;
  customerEmail?: string | null;
  userId?: string | null;
}

/** 1 hour after delivered/picked_up → ask for a review. */
export async function handleReviewRequest(payload: ReviewRequestPayload) {
  const existing = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(eq(reviews.orderId, payload.orderId))
    .limit(1);
  if (existing.length > 0) return; // already reviewed

  const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://amorino-five.vercel.app"}/review/${payload.orderNumber}`;
  await sendWhatsAppTemplate(payload.customerPhone, "review_request", [
    payload.orderNumber,
    reviewUrl,
  ]);
  await logNotification({
    orderId: payload.orderId,
    userId: payload.userId ?? null,
    type: "whatsapp",
    body: `Review request for order ${payload.orderNumber}`,
    status: "sent",
  });
}

export interface AbandonedPaymentPayload {
  orderId: string;
  orderNumber: string;
  customerPhone: string;
  customerEmail?: string | null;
  userId?: string | null;
}

/** ~10 min after pending_payment with no movement → gentle reminder. */
export async function handleAbandonedPayment(payload: AbandonedPaymentPayload) {
  const [order] = await db.select().from(orders).where(eq(orders.id, payload.orderId)).limit(1);
  if (!order || order.status !== "pending_payment") return; // resolved meanwhile

  const trackUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://amorino-five.vercel.app"}/track/${payload.orderNumber}`;
  const message = `Amorino Café: your order ${payload.orderNumber} is still waiting for payment. Complete it here: ${trackUrl}`;
  await sendSms(payload.customerPhone, message);
  await logNotification({
    orderId: payload.orderId,
    userId: payload.userId ?? null,
    type: "sms",
    body: `Abandoned payment reminder for ${payload.orderNumber}`,
    status: "sent",
  });
}

export interface IdleOrderPayload {
  orderId: string;
  orderNumber: string;
}

/** 20 min stuck in `preparing` (or 10 min in `confirmed`) → alert the owner. */
export async function handleIdleOrder(payload: IdleOrderPayload) {
  const [order] = await db.select().from(orders).where(eq(orders.id, payload.orderId)).limit(1);
  if (!order) return;
  if (!["confirmed", "preparing"].includes(order.status)) return; // moved on

  const ownerPhone = process.env.OWNER_ALERT_PHONE ?? "254706090909";
  const message = `Amorino alert: order ${payload.orderNumber} has been stuck at "${order.status}" for a while. Check the kitchen!`;
  await sendSms(ownerPhone, message);
  await logNotification({
    orderId: payload.orderId,
    type: "sms",
    title: "Idle order alert",
    body: message,
    status: "sent",
  });
}

export interface RiderCheckinPayload {
  orderId: string;
  riderId: string;
  orderNumber: string;
}

/** Rider has not broadcast a GPS ping for >5 min while out_for_delivery → nudge. */
export async function handleRiderCheckin(payload: RiderCheckinPayload) {
  const [order] = await db.select().from(orders).where(eq(orders.id, payload.orderId)).limit(1);
  if (!order || order.status !== "out_for_delivery") return;

  const [latest] = await db
    .select()
    .from(riderLocations)
    .where(and(eq(riderLocations.riderId, payload.riderId), eq(riderLocations.orderId, payload.orderId)))
    .orderBy(desc(riderLocations.recordedAt))
    .limit(1);

  if (latest) {
    const ageMin =
      (Date.now() - (latest.recordedAt ? new Date(latest.recordedAt).getTime() : Date.now())) / 60000;
    if (ageMin < 5) return; // still broadcasting
  }

  const [rider] = await db
    .select({ phone: users.phone })
    .from(users)
    .where(eq(users.id, payload.riderId))
    .limit(1);
  if (rider?.phone) {
    const message = `Amorino: your live location for ${payload.orderNumber} stopped updating. Please keep the rider app open.`;
    await sendSms(rider.phone, message);
    await logNotification({
      orderId: payload.orderId,
      type: "sms",
      title: "Rider check-in",
      body: message,
      status: "sent",
    });
  }
}

/**
 * Finds candidates for the periodic sweep jobs. Returns:
 * - reviewCandidates: delivered/picked_up orders from ~1h ago without a review
 * - stalePayments: pending_payment orders older than N minutes
 * - idleOrders: confirmed/preparing orders older than N minutes
 */
export async function getSweepCandidates() {
  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60 * 1000);
  const tenMinAgo = new Date(now - 10 * 60 * 1000);
  const twentyMinAgo = new Date(now - 20 * 60 * 1000);

  const [recent, reviewCandidates, stalePayments, idleOrders] = await Promise.all([
    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        createdAt: orders.createdAt,
        customerPhone: orders.customerPhone,
        customerEmail: orders.customerEmail,
        userId: orders.userId,
        riderId: orders.riderId,
      })
      .from(orders)
      .where(gte(orders.createdAt, new Date(now - 3 * 24 * 60 * 60 * 1000))),
    db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          or(eq(orders.status, "delivered"), eq(orders.status, "picked_up")),
          lt(orders.updatedAt, hourAgo)
        )
      ),
    db
      .select({ id: orders.id, orderNumber: orders.orderNumber, customerPhone: orders.customerPhone, userId: orders.userId })
      .from(orders)
      .where(and(eq(orders.status, "pending_payment"), lt(orders.createdAt, tenMinAgo))),
    db
      .select({ id: orders.id, orderNumber: orders.orderNumber })
      .from(orders)
      .where(
        and(
          or(eq(orders.status, "confirmed"), eq(orders.status, "preparing")),
          lt(orders.updatedAt, twentyMinAgo)
        )
      ),
  ]);

  const reviewedIds = new Set(
    (
      await db
        .select({ orderId: reviews.orderId })
        .from(reviews)
        .where(inArray(reviews.orderId, reviewCandidates.map((r) => r.id)))
    ).map((r) => r.orderId)
  );

  return {
    reviewCandidates: recent.filter(
      (o) =>
        (o.status === "delivered" || o.status === "picked_up") &&
        !!o.createdAt &&
        new Date(o.createdAt).getTime() < hourAgo.getTime() &&
        !reviewedIds.has(o.id)
    ),
    stalePayments,
    idleOrders,
  };
}

/** List of supported jobs + human descriptions (for /admin/jobs). */
export const JOB_DEFINITIONS = [
  { key: "notify-order-status", label: "Order status notification", description: "Sends SMS/WhatsApp/email on order status changes." },
  { key: "review-request", label: "Review request", description: "Asks for a review 1 hour after delivery." },
  { key: "abandoned-payment", label: "Abandoned payment reminder", description: "SMS reminder ~10 min after an unpaid order stalls." },
  { key: "idle-order", label: "Idle order alert", description: "Alerts the owner when an order is stuck in confirmed/preparing." },
  { key: "rider-checkin", label: "Rider check-in", description: "Nudges a rider whose live location stopped updating." },
  { key: "sweep", label: "Sweep (all of the above)", description: "Finds candidates and enqueues the targeted jobs." },
] as const;

export type JobKey = (typeof JOB_DEFINITIONS)[number]["key"];

/** Collects sweep candidates and enqueues the follow-up jobs. */
export async function handleSweep() {
  const { reviewCandidates, stalePayments, idleOrders } = await getSweepCandidates();
  const { enqueueJob } = await import("@/lib/qstash");
  let enqueued = 0;

  for (const o of reviewCandidates) {
    const ok = await enqueueJob("review-request", {
      orderId: o.id,
      orderNumber: o.orderNumber,
      customerPhone: o.customerPhone,
      customerEmail: o.customerEmail,
      userId: o.userId,
    });
    if (ok) enqueued++;
  }
  for (const o of stalePayments) {
    const ok = await enqueueJob("abandoned-payment", {
      orderId: o.id,
      orderNumber: o.orderNumber,
      customerPhone: o.customerPhone,
      customerEmail: null,
      userId: o.userId,
    });
    if (ok) enqueued++;
  }
  for (const o of idleOrders) {
    const ok = await enqueueJob("idle-order", {
      orderId: o.id,
      orderNumber: o.orderNumber,
    });
    if (ok) enqueued++;
  }
  await logNotification({
    type: "push",
    body: `Sweep complete: enqueued ${enqueued} jobs`,
    status: enqueued > 0 ? "sent" : "pending",
  });
  return { reviewCandidates: reviewCandidates.length, stalePayments: stalePayments.length, idleOrders: idleOrders.length, enqueued };
}