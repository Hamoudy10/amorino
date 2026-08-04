import { NextRequest } from "next/server";
import { trackOrder } from "@/lib/orders";
import { trackOrderSchema } from "@/lib/validators";
import { ok, fail } from "@/lib/api";

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = trackOrderSchema.safeParse({
    orderNumber: params.orderNumber,
    phone: params.phone,
  });
  if (!parsed.success) {
    return fail("Invalid track parameters", 400, parsed.error.flatten());
  }

  const order = await trackOrder(parsed.data.orderNumber, parsed.data.phone);
  if (!order) {
    return fail("Order not found. Check the order number and phone you used.", 404);
  }
  return ok(order);
}