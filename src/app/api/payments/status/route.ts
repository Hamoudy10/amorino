import { NextRequest } from "next/server";
import { db } from "@/db";
import { payments, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { queryStkStatus, MPESA_SUCCESS_CODES } from "@/lib/mpesa";
import { mpesaStatusSchema } from "@/lib/validators";
import { ok, fail, serverError } from "@/lib/api";
import { markPaymentSuccess, markPaymentFailed } from "@/lib/payments";
import { emitOrderEvent } from "@/lib/realtime";

/**
 * Polls M-Pesa for the final status of an STK push (fallback when the
 * callback is delayed or missed by the client).
 */
export async function GET(req: NextRequest) {
  try {
    const parsed = mpesaStatusSchema.safeParse({
      checkoutRequestId: req.nextUrl.searchParams.get("checkoutRequestId"),
    });
    if (!parsed.success) return fail("Missing checkoutRequestId", 400);

    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.checkoutRequestId, parsed.data.checkoutRequestId))
      .limit(1);

    if (!payment) return fail("Payment not found", 404);

    // Already settled locally — return stored result.
    if (payment.status === "success" || payment.status === "failed") {
      return ok({
        status: payment.status,
        mpesaReceiptNumber: payment.mpesaReceiptNumber,
        resultDesc: payment.resultDesc,
        locallySettled: true,
      });
    }

    // Query Daraja directly.
    let result;
    try {
      result = await queryStkStatus(parsed.data.checkoutRequestId);
    } catch {
      return ok({ status: "pending", message: "M-Pesa is still processing. Try again shortly." });
    }

    if (MPESA_SUCCESS_CODES.includes(String(result.ResultCode))) {
      // Successful transaction — need receipt; fetch from latest callback if
      // any, otherwise mark pending until callback lands.
      const settled = await markPaymentSuccess({
        paymentId: payment.id,
        resultCode: String(result.ResultCode),
        resultDesc: result.ResultDesc,
      });
      return ok({ status: "success", paymentStatus: settled.order?.paymentStatus ?? "paid" });
    }

    if (result.ResultCode !== "1037" && result.ResultCode !== "1") {
      // 1037 = request cancelled by user; 1 = still in progress
      await markPaymentFailed({
        paymentId: payment.id,
        resultCode: String(result.ResultCode),
        resultDesc: result.ResultDesc,
      });
      if (payment.orderId) {
        await emitOrderEvent({
          orderId: payment.orderId,
          orderNumber: "",
          status: "pending_payment",
          updatedAt: new Date().toISOString(),
        });
      }
      return ok({ status: "failed", resultDesc: result.ResultDesc });
    }

    return ok({ status: "pending", message: "Waiting for customer to complete payment." });
  } catch (err) {
    return serverError(err);
  }
}