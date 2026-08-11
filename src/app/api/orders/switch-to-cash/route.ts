import { NextRequest } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, fail, serverError } from "@/lib/api";
import { normalizePhone } from "@/lib/utils";
import { updateOrderStatus } from "@/lib/orders";

/**
 * Lets a customer abandon a pending M-Pesa payment and pay cash instead.
 * Only allowed while the order is still pending_payment and the phone matches.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const orderNumber = String(body?.orderNumber ?? "").trim();
    const phone = normalizePhone(String(body?.phone ?? ""));

    if (!/^AMR-\d{6}$/.test(orderNumber) || !/^254[0-9]{9}$/.test(phone)) {
      return fail("Invalid order or phone", 400);
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1);

    if (!order) return fail("Order not found", 404);
    if (normalizePhone(order.customerPhone) !== phone) {
      return fail("Phone does not match this order", 403);
    }
    if (order.status !== "pending_payment") {
      return fail("This order can no longer be switched to cash", 400);
    }

    await updateOrderStatus({
      orderId: order.id,
      status: "confirmed",
      actorUserId: null,
    });
    await db
      .update(orders)
      .set({ paymentMethod: "cash", paymentStatus: "pending", updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    return ok({ switched: true, orderNumber });
  } catch (err) {
    return serverError(err);
  }
}
