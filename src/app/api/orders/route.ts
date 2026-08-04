import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createOrder } from "@/lib/orders";
import { createOrderSchema } from "@/lib/validators";
import { ok, fail, serverError } from "@/lib/api";
import { rateLimit } from "@/lib/redis";
import { getClientIp } from "@/lib/request";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const allowed = await rateLimit(`rl:order:${ip}`, 5, 60);
    if (!allowed) {
      return fail("Too many orders. Please try again in a minute.", 429);
    }

    const body = await req.json().catch(() => null);
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid order data", 400, parsed.error.flatten());
    }

    const session = await getSessionUser();
    const order = await createOrder({
      ...parsed.data,
      userId: session?.id ?? null,
    });

    return ok({
      orderNumber: order.orderNumber,
      id: order.id,
      status: order.status,
      total: order.total,
      paymentMethod: order.paymentMethod,
    }, 201);
  } catch (err) {
    return serverError(err);
  }
}