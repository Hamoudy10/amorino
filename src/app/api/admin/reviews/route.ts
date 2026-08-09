import { NextRequest } from "next/server";
import { db } from "@/db";
import { reviews, orders } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { reviewModerationSchema } from "@/lib/validators";
import { ok, fail, serverError, unauthorized } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("owner", "admin");
    if (!user) return unauthorized();

    const rows = await db
      .select({
        review: reviews,
        orderNumber: orders.orderNumber,
      })
      .from(reviews)
      .leftJoin(orders, eq(reviews.orderId, orders.id))
      .orderBy(desc(reviews.createdAt))
      .limit(200);

    return ok(rows.map((r) => ({ ...r.review, orderNumber: r.orderNumber ?? null })));
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireRole("owner", "admin");
    if (!user) return unauthorized();

    const body = await req.json().catch(() => null);
    const parsed = reviewModerationSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid moderation data", 400, parsed.error.flatten());

    const [updated] = await db
      .update(reviews)
      .set({ isVisible: parsed.data.isVisible })
      .where(eq(reviews.id, parsed.data.reviewId))
      .returning();

    return ok(updated);
  } catch (err) {
    return serverError(err);
  }
}

const replySchema = z.object({
  reviewId: z.string().uuid(),
  reply: z.string().max(2000).optional(),
});

/** Admin reply to a customer review (shown publicly under the review). */
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("owner", "admin");
    if (!user) return unauthorized();

    const body = await req.json().catch(() => null);
    const parsed = replySchema.safeParse(body);
    if (!parsed.success) return fail("Invalid reply data", 400, parsed.error.flatten());

    const [updated] = await db
      .update(reviews)
      .set({
        reply: parsed.data.reply?.trim() ? parsed.data.reply.trim() : null,
        repliedAt: parsed.data.reply?.trim() ? new Date() : null,
        isVisible: true, // replying implies the review is shown
      })
      .where(eq(reviews.id, parsed.data.reviewId))
      .returning();

    if (!updated) return fail("Review not found", 404);
    return ok(updated);
  } catch (err) {
    return serverError(err);
  }
}