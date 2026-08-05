import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  parseCallbackMetadata,
  MPESA_SUCCESS_CODES,
  type StkCallbackBody,
} from "@/lib/mpesa";
import { markPaymentSuccess, markPaymentFailed } from "@/lib/payments";
import { emitOrderEvent } from "@/lib/realtime";

/**
 * Safaricom Daraja STK push callback. Safaricom expects HTTP 200 quickly.
 * The body is wrapped as { Body: { stkCallback: {...} } }.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as StkCallbackBody;
  const callback = body.Body?.stkCallback;

  if (!callback?.CheckoutRequestID) {
    return NextResponse.json({ ok: false, error: "Missing stkCallback" }, { status: 400 });
  }

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.checkoutRequestId, callback.CheckoutRequestID))
    .limit(1);

  if (!payment) {
    // Unknown checkout request — acknowledge to Safaricom, nothing to process.
    return NextResponse.json({ ok: true, ignored: true });
  }
  if (payment.status === "success") {
    // Idempotent: Safaricom may resend callbacks.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const resultCode = String(callback.ResultCode ?? "1");
  const meta = parseCallbackMetadata(body);

  if (MPESA_SUCCESS_CODES.includes(resultCode) && meta.mpesaReceiptNumber) {
    await markPaymentSuccess({
      paymentId: payment.id,
      resultCode,
      resultDesc: callback.ResultDesc,
      mpesaReceiptNumber: meta.mpesaReceiptNumber,
      transactionDate: meta.transactionDate ?? null,
      rawCallback: body,
    });
  } else {
    await markPaymentFailed({
      paymentId: payment.id,
      resultCode,
      resultDesc: callback.ResultDesc,
    });
  }

  if (payment.orderId) {
    await emitOrderEvent({
      orderId: payment.orderId,
      orderNumber: "",
      status: MPESA_SUCCESS_CODES.includes(resultCode) ? "confirmed" : "pending_payment",
      updatedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true });
}