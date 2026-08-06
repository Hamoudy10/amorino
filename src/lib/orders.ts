import { and, desc, eq, gte, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  menuItems,
  orders,
  orderItems,
  activityLogs,
  users,
  type OrderStatus,
} from "@/db/schema";
import { generateOrderNumber } from "@/lib/utils";
import { calculateDeliveryFee, haversineKm, CAFE_COORDS, getSettings } from "@/lib/settings";
import { emitOrderEvent } from "@/lib/realtime";
import { enqueueJob } from "@/lib/qstash";
import { notifyOrderStatus } from "@/lib/notifications";

export interface CartItemInput {
  menuItemId: string;
  quantity: number;
  options?: { name: string; price: number }[];
}

export interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  type: "delivery" | "pickup" | "dine_in";
  items: Array<{ menuItemId: string; quantity: number; options?: Array<{ name: string; price: number }> }>;
  deliveryAddress?: string | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  specialInstructions?: string | null;
  paymentMethod: "mpesa" | "cash";
  tip?: number;
  userId?: string | null;
}

export const DELIVERY_TYPE = "delivery";
export const ORDER_NUMBER_PREFIX = "AMR";

export async function getNextOrderNumber(): Promise<string> {
  const latest = await db
    .select({ orderNumber: orders.orderNumber })
    .from(orders)
    .where(likeOrderNumber())
    .orderBy(desc(orders.orderNumber))
    .limit(1);
  let seq = 0;
  if (latest.length > 0) {
    const parsed = parseInt(latest[0].orderNumber.replace(`${ORDER_NUMBER_PREFIX}-`, ""), 10);
    if (!Number.isNaN(parsed)) seq = parsed;
  }
  return generateOrderNumber(seq + 1);
}

function likeOrderNumber() {
  // Prefix is a hardcoded constant — embed as a literal, not a bind
  // parameter (parameters break LIKE type inference → error 42P18).
  return sql`${orders.orderNumber} LIKE 'AMR-%'`;
}

export async function createOrder(input: CreateOrderInput) {
  const itemIds = input.items.map((i) => i.menuItemId);
  const menuRows = itemIds.length
    ? await db.select().from(menuItems).where(inArray(menuItems.id, itemIds)).execute()
    : [];

  const menuById = new Map(menuRows.map((m) => [m.id, m]));
  const unavailable = itemIds.filter((id) => !menuById.has(id) || !menuById.get(id)?.isAvailable);
  if (unavailable.length > 0) {
    throw new Error("One or more items are no longer available");
  }

  let subtotal = 0;
  const itemRows = [];
  for (const item of input.items) {
    const menu = menuById.get(item.menuItemId)!;
    const optionTotal = (item.options ?? []).reduce((sum, o) => sum + o.price, 0);
    const unitPrice = Number(menu.price) + optionTotal;
    const totalPrice = unitPrice * item.quantity;
    subtotal += totalPrice;
    itemRows.push({
      menuItemId: item.menuItemId,
      name: menu.name,
      quantity: item.quantity,
      unitPrice: unitPrice.toFixed(2),
      totalPrice: totalPrice.toFixed(2),
      options: item.options ?? [],
    });
  }

  // Delivery fee by zone/distance
  let deliveryFee = 0;
  let maxPrep = 0;
  if (input.type === DELIVERY_TYPE && input.deliveryLat && input.deliveryLng) {
    const distance = haversineKm(
      CAFE_COORDS.lat,
      CAFE_COORDS.lng,
      input.deliveryLat,
      input.deliveryLng
    );
    deliveryFee = await calculateDeliveryFee(distance);
    if (deliveryFee < 0) {
      throw new Error("Delivery address is outside our delivery zone");
    }
  }
  for (const id of itemIds) {
    maxPrep = Math.max(maxPrep, menuById.get(id)?.prepTimeMinutes ?? 15);
  }

  const orderNumber = await getNextOrderNumber();
  const total = Math.round(subtotal + deliveryFee + (input.tip ?? 0));
  // orders.user_id is a FK to users.id — callers may pass a Clerk ID, so
  // resolve it to the DB user id first (null for guests).
  const dbUserId = await resolveActorUserId(input.userId);

  // Tip split: rider gets the configured percentage, house keeps the rest.
  const s = await getSettings();
  const tip = input.tip ?? 0;
  const riderPercent = s.delivery.tipSplitRiderPercent ?? 80;
  const tipRiderShare = Math.round((tip * riderPercent) / 100);
  const tipHouseShare = tip - tipRiderShare;

  const [order] = await db
    .insert(orders)
    .values({
      orderNumber,
      userId: dbUserId,
      customerName: input.customerName,
      customerPhone: normalizePhone(input.customerPhone),
      customerEmail: input.customerEmail ?? null,
      type: input.type,
      status: input.paymentMethod === "cash" ? "confirmed" : "pending_payment",
      paymentStatus: input.paymentMethod === "cash" ? "pending" : "pending",
      paymentMethod: input.paymentMethod,
      subtotal: subtotal.toFixed(2),
      deliveryFee: deliveryFee.toFixed(2),
      tip: (input.tip ?? 0).toFixed(2),
      tipRiderShare: tipRiderShare.toFixed(2),
      tipHouseShare: tipHouseShare.toFixed(2),
      discount: "0",
      total: total.toFixed(2),
      deliveryAddress: input.deliveryAddress ?? null,
      deliveryLat: input.deliveryLat?.toString() ?? null,
      deliveryLng: input.deliveryLng?.toString() ?? null,
      specialInstructions: input.specialInstructions ?? null,
      estimatedReadyAt: new Date(Date.now() + (maxPrep + 10) * 60_000),
    })
    .returning();

  for (const row of itemRows) {
    await db.insert(orderItems).values({ ...row, orderId: order.id });
  }

  await db.insert(activityLogs).values({
    orderId: order.id,
    userId: dbUserId,
    action: "order_created",
    metadata: { type: input.type, paymentMethod: input.paymentMethod, total },
  });

  // Notifications and realtime must NEVER block order creation/payment —
  // fire and forget; failures are logged inside the notification layer.
  void emitOrderEvent({
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status ?? "pending_payment",
    updatedAt: new Date().toISOString(),
    action: "order_created",
  });

  // Abandoned-payment reminder for M-Pesa orders that stall (10 min).
  if (input.paymentMethod === "mpesa") {
    void enqueueJob(
      "abandoned-payment",
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        userId: order.userId,
      },
      600
    );
  }

  if (input.paymentMethod === "cash") {
    void notifyOrderStatus({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      userId: dbUserId,
      status: "confirmed",
      etaMinutes: maxPrep + 10,
    });
  }

  return order;
}

export function getOrderStatusProgress(status: OrderStatus): number {
  const order = ["pending_payment", "paid", "confirmed", "preparing", "ready", "out_for_delivery", "delivered", "picked_up"];
  return order.indexOf(status);
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pending Payment",
  paid: "Payment Received",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  picked_up: "Picked Up",
  cancelled: "Cancelled",
};

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["out_for_delivery", "picked_up", "delivered"],
  out_for_delivery: ["delivered"],
  delivered: [],
  picked_up: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * activity_logs.user_id is a FK to users.id (UUID). Callers may pass a Clerk
 * ID (user_...) — resolve it to the DB user id; anything unresolvable logs
 * as null rather than failing the whole operation.
 */
export async function resolveActorUserId(actorUserId?: string | null): Promise<string | null> {
  if (!actorUserId) return null;
  if (UUID_RE.test(actorUserId)) return actorUserId;
  if (actorUserId.startsWith("user_")) {
    const [row] = await db.select({ id: users.id }).from(users).where(eq(users.clerkId, actorUserId)).limit(1);
    return row?.id ?? null;
  }
  return null;
}

export async function updateOrderStatus(input: {
  orderId: string;
  status: OrderStatus;
  actorUserId?: string | null;
}): Promise<boolean> {
  const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
  if (!order) throw new Error("Order not found");

  const current = (order.status ?? "pending_payment") as OrderStatus;
  if (!canTransition(current, input.status)) {
    throw new Error(`Cannot transition order from ${current} to ${input.status}`);
  }

  const now = new Date();
  const updates: Partial<typeof order> = {
    status: input.status,
    updatedAt: now,
  };
  if (input.status === "delivered") updates.deliveredAt = now;

  const [updated] = await db
    .update(orders)
    .set({ ...updates, updatedAt: now })
    .where(eq(orders.id, input.orderId))
    .returning();

  await db.insert(activityLogs).values({
    orderId: updated.id,
    userId: await resolveActorUserId(input.actorUserId),
    action: "status_changed",
    metadata: { from: current, to: input.status },
  });

  void emitOrderEvent({
    orderId: updated.id,
    orderNumber: updated.orderNumber,
    status: updated.status ?? input.status,
    updatedAt: now.toISOString(),
  });

  void notifyOrderStatus({
    orderId: updated.id,
    orderNumber: updated.orderNumber,
    customerPhone: updated.customerPhone,
    customerEmail: updated.customerEmail,
    userId: updated.userId,
    status: input.status,
    etaMinutes: null,
  });

  // Background follow-ups for key transitions.
  if (input.status === "delivered" || input.status === "picked_up") {
    void enqueueJob(
      "review-request",
      {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        customerPhone: updated.customerPhone,
        customerEmail: updated.customerEmail,
        userId: updated.userId,
      },
      3600
    );
  } else if (input.status === "confirmed" || input.status === "preparing") {
    void enqueueJob(
      "idle-order",
      { orderId: updated.id, orderNumber: updated.orderNumber },
      1200
    );
  } else if (input.status === "out_for_delivery") {
    void enqueueJob(
      "rider-checkin",
      { orderId: updated.id, riderId: updated.riderId, orderNumber: updated.orderNumber },
      300
    );
  }

  return true;
}

export async function assignRider(input: {
  orderId: string;
  riderId: string | null;
  actorUserId?: string | null;
}) {
  const [updated] = await db
    .update(orders)
    .set({ riderId: input.riderId, updatedAt: new Date() })
    .where(eq(orders.id, input.orderId))
    .returning();
  await db.insert(activityLogs).values({
    orderId: updated.id,
    userId: await resolveActorUserId(input.actorUserId),
    action: "rider_assigned",
    metadata: { riderId: input.riderId },
  });
  return updated;
}

export interface TrackResult {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  type: "delivery" | "pickup" | "dine_in";
  customerName: string;
  total: string;
  paymentStatus: string | null;
  estimatedReadyAt: Date | null;
  deliveryAddress: string | null;
  riderId: string | null;
  createdAt: Date | null;
  items: Array<{ name: string; quantity: number; totalPrice: string }>;
}

export async function trackOrder(orderNumber: string, phone: string): Promise<TrackResult | null> {
  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      type: orders.type,
      customerName: orders.customerName,
      total: orders.total,
      paymentStatus: orders.paymentStatus,
      estimatedReadyAt: orders.estimatedReadyAt,
      deliveryAddress: orders.deliveryAddress,
      riderId: orders.riderId,
      riderName: users.name,
      riderPhone: users.phone,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .leftJoin(users, eq(orders.riderId, users.id))
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);
  if (rows.length === 0) return null;
  const order = rows[0];
  // Phones may be stored as 07.. / 2547.. / +2547.. — compare normalized.
  if (normalizePhone(order.customerPhone) !== normalizePhone(phone)) return null;
  const items = await db
    .select({ name: orderItems.name, quantity: orderItems.quantity, totalPrice: orderItems.totalPrice })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));
  return { orderId: order.id, ...order, items };
}

const FINAL_STATUSES: OrderStatus[] = ["delivered", "picked_up", "cancelled"];

export async function getActiveOrders() {
  return db
    .select()
    .from(orders)
    .where(and(notInArray(orders.status, FINAL_STATUSES), gte(orders.createdAt, new Date(Date.now() - 7 * 24 * 3600_000))))
    .orderBy(desc(orders.createdAt));
}
