import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, orders, activityLogs } from "@/db/schema";
import { emitOrderEvent } from "@/lib/realtime";
import { notifyOrderStatus } from "@/lib/notifications";

export async function markPaymentSuccess(input: {
  paymentId: string;
  resultCode?: string | null;
  resultDesc?: string | null;
  mpesaReceiptNumber?: string | null;
  transactionDate?: Date | null;
  rawCallback?: unknown;
}) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, input.paymentId))
    .limit(1);
  if (!payment) throw new Error("Payment not found");
  if (payment.status === "success") return { payment, order: null };

  const [updated] = await db
    .update(payments)
    .set({
      status: "success",
      resultCode: input.resultCode ?? payment.resultCode,
      resultDesc: input.resultDesc ?? payment.resultDesc,
      mpesaReceiptNumber: input.mpesaReceiptNumber ?? payment.mpesaReceiptNumber,
      transactionDate: input.transactionDate ?? payment.transactionDate,
      rawCallback: (input.rawCallback as never) ?? payment.rawCallback,
    })
    .where(eq(payments.id, payment.id))
    .returning();

  if (payment.orderId) {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, payment.orderId))
      .limit(1);
    if (order && order.paymentStatus !== "paid") {
      const now = new Date();
      const [updatedOrder] = await db
        .update(orders)
        .set({
          paymentStatus: "paid",
          mpesaReceiptNumber: input.mpesaReceiptNumber ?? payment.mpesaReceiptNumber,
          status: "confirmed",
          updatedAt: now,
        })
        .where(eq(orders.id, order.id))
        .returning();

      await db.insert(activityLogs).values({
        orderId: order.id,
        userId: null,
        action: "payment_received",
        metadata: { receipt: input.mpesaReceiptNumber, amount: payment.amount },
      });

      // Notifications and realtime must never block payment processing.
      void emitOrderEvent({
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: "confirmed",
        updatedAt: now.toISOString(),
      });

      void notifyOrderStatus({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        userId: order.userId,
        status: "paid",
        etaMinutes: order.estimatedReadyAt
          ? Math.max(1, Math.round((order.estimatedReadyAt.getTime() - now.getTime()) / 60000))
          : null,
      });

      return { payment: updated, order: updatedOrder };
    }
  }

  return { payment: updated, order: null };
}

export async function markPaymentFailed(input: {
  paymentId: string;
  resultCode?: string | null;
  resultDesc?: string | null;
}) {
  const [updated] = await db
    .update(payments)
    .set({
      status: "failed",
      resultCode: input.resultCode ?? null,
      resultDesc: input.resultDesc ?? null,
    })
    .where(eq(payments.id, input.paymentId))
    .returning();
  return updated;
}
