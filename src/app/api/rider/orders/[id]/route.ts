import { NextRequest } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, unauthorized, serverError, fail } from "@/lib/api";
import { getSessionUserWithDbId } from "@/lib/auth";
import { updateOrderStatus } from "@/lib/orders";
import { z } from "zod";

const riderStatusSchema = z.object({
  status: z.enum(["preparing", "ready", "out_for_delivery", "delivered"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUserWithDbId();
    if (!user || !user.dbUserId) return unauthorized("Rider account not linked");

    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = riderStatusSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid status", 400, parsed.error.flatten());

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) return fail("Order not found", 404);
    if (order.riderId !== user.dbUserId && !["owner", "admin"].includes(user.role)) {
      return fail("You are not assigned to this order", 403);
    }

    await updateOrderStatus({ orderId: id, status: parsed.data.status, actorUserId: user.id });
    return ok({ updated: true });
  } catch (err) {
    return serverError(err);
  }
}