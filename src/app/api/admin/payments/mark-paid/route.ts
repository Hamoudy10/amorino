import { NextRequest } from "next/server";
import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, serverError, unauthorized, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { markPaymentSuccess } from "@/lib/payments";
import { z } from "zod";

export const dynamic = "force-dynamic";

const markPaidSchema = z.object({ orderId: z.string().uuid() });

/**
 * Manual "mark paid" override (owner only) — for cash reconciliation edge
 * cases where payment arrived but the automation never recorded it.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("owner");
    if (!user) return unauthorized("Owner role required");

    const body = await req.json().catch(() => null);
    const parsed = markPaidSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid request", 400, parsed.error.flatten());

    const [order] = await db.select().from(orders).where(eq(orders.id, parsed.data.orderId)).limit(1);
    if (!order) return fail("Order not found", 404);

    if (order.paymentStatus === "paid") {
      return ok({ alreadyPaid: true });
    }

    // Ensure a payment row exists, then run the standard success path
    // (flips order to paid + confirmed, logs, notifies, emits event).
    let [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, order.id))
      .limit(1);
    if (!payment) {
      [payment] = await db
        .insert(payments)
        .values({
          orderId: order.id,
          phoneNumber: order.customerPhone,
          amount: order.total,
          status: "initiated",
        })
        .returning();
    }

    const settled = await markPaymentSuccess({
      paymentId: payment.id,
      resultCode: "MANUAL",
      resultDesc: "Marked paid manually by owner",
    });

    return ok({ markedPaid: true, orderStatus: settled.order?.status ?? order.status });
  } catch (err) {
    return serverError(err);
  }
}