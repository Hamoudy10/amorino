import { NextRequest } from "next/server";
import { db } from "@/db";
import { payments, orders } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import {
  initiateStkPush,
  isMpesaConfigured,
  MPESA_SUCCESS_CODES,
} from "@/lib/mpesa";
import { mpesaInitiateSchema } from "@/lib/validators";
import { ok, fail, serverError } from "@/lib/api";
import { rateLimit } from "@/lib/redis";
import { getClientIp } from "@/lib/request";
import { emitOrderEvent } from "@/lib/realtime";

export async function POST(req: NextRequest) {
  try {
    if (!isMpesaConfigured()) {
      return fail("M-Pesa is not configured on this server.", 503);
    }

    const ip = getClientIp(req);
    const allowed = await rateLimit(`rl:mpesa:${ip}`, 5, 60);
    if (!allowed) {
      return fail("Too many payment attempts. Please wait a minute.", 429);
    }

    const body = await req.json().catch(() => null);
    const parsed = mpesaInitiateSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid payment request", 400, parsed.error.flatten());
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, parsed.data.orderNumber))
      .limit(1);
    if (!order) return fail("Order not found", 404);
    if (order.paymentStatus === "paid") {
      return fail("Order is already paid", 409);
    }
    if (order.paymentMethod !== "mpesa") {
      return fail("This order is not payable by M-Pesa", 400);
    }

    const amount = Number(order.total);

    // Create payment record
    const [payment] = await db
      .insert(payments)
      .values({
        orderId: order.id,
        phoneNumber: parsed.data.phone,
        amount: amount.toFixed(2),
        status: "initiated",
      })
      .returning();

    try {
      const result = await initiateStkPush({
        phone: parsed.data.phone,
        amount,
        accountReference: order.orderNumber,
        transactionDesc: `Payment for ${order.orderNumber}`,
      });

      const responseCode = String(result.ResponseCode ?? "");
      if (!MPESA_SUCCESS_CODES.includes(responseCode)) {
        await db
          .update(payments)
          .set({ status: "failed", resultDesc: result.ResponseDescription })
          .where(eq(payments.id, payment.id));
        return fail(`M-Pesa rejected the request: ${result.ResponseDescription}`, 400);
      }

      await db
        .update(payments)
        .set({
          merchantRequestId: result.MerchantRequestID,
          checkoutRequestId: result.CheckoutRequestID,
        })
        .where(eq(payments.id, payment.id));

      return ok({
        checkoutRequestId: result.CheckoutRequestID,
        merchantRequestId: result.MerchantRequestID,
        responseDescription: result.CustomerMessage ?? result.ResponseDescription,
        orderNumber: order.orderNumber,
        amount,
      });
    } catch (err) {
      await db
        .update(payments)
        .set({ status: "failed", resultDesc: "STK push request failed" })
        .where(eq(payments.id, payment.id));
      throw err;
    }
  } catch (err) {
    return serverError(err);
  }
}