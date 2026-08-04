import { NextRequest } from "next/server";
import { db } from "@/db";
import { reviews, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createReviewSchema } from "@/lib/validators";
import { ok, fail, serverError } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = createReviewSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid review data", 400, parsed.error.flatten());
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, parsed.data.orderNumber))
      .limit(1);

    if (!order) return fail("Order not found", 404);
    if (order.customerPhone !== parsed.data.phone) {
      return fail("This order does not match the provided phone number", 403);
    }
    if (order.status !== "delivered" && order.status !== "picked_up") {
      return fail("You can only review an order once it has been delivered or picked up", 400);
    }

    const existing = await db.select().from(reviews).where(eq(reviews.orderId, order.id)).limit(1);
    if (existing.length > 0) {
      return fail("This order has already been reviewed", 409);
    }

    const session = await getSessionUser();
    const [review] = await db
      .insert(reviews)
      .values({
        orderId: order.id,
        userId: session?.id ?? null,
        rating: parsed.data.rating,
        comment: parsed.data.comment || null,
      })
      .returning();

    return ok(review, 201);
  } catch (err) {
    return serverError(err);
  }
}