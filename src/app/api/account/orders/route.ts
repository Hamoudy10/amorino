import { NextRequest } from "next/server";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { ok, unauthorized, serverError } from "@/lib/api";
import { getSessionUserWithDbId } from "@/lib/auth";

/**
 * Orders belonging to the signed-in customer: linked by account (users.id)
 * and/or by the phone on file. Returns latest 20 with items.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUserWithDbId();
    if (!user) return unauthorized();

    const conditions = [];
    if (user.dbUserId) conditions.push(eq(orders.userId, user.dbUserId));
    if (user.phone) conditions.push(eq(orders.customerPhone, user.phone));

    if (conditions.length === 0) return ok([]);

    const rows = await db
      .select()
      .from(orders)
      .where(and(or(...conditions)))
      .orderBy(desc(orders.createdAt))
      .limit(20);

    const items = rows.length
      ? await db
          .select()
          .from(orderItems)
          .where(inArray(orderItems.orderId, rows.map((r) => r.id)))
      : [];

    const itemsByOrder = new Map<string, typeof items>();
    for (const item of items) {
      const list = itemsByOrder.get(item.orderId) ?? [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    return ok(
      rows.map((o) => ({
        ...o,
        items: itemsByOrder.get(o.id) ?? [],
      }))
    );
  } catch (err) {
    return serverError(err);
  }
}