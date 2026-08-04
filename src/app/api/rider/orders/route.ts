import { NextRequest } from "next/server";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { and, eq, inArray, desc, ne } from "drizzle-orm";
import { ok, unauthorized, serverError, fail } from "@/lib/api";
import { getSessionUserWithDbId } from "@/lib/auth";
import { updateOrderStatus } from "@/lib/orders";
import { z } from "zod";

export async function GET() {
  try {
    const user = await getSessionUserWithDbId();
    if (!user || !user.dbUserId) return unauthorized("Rider account not linked. Ask the owner to add you.");

    const assigned = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.riderId, user.dbUserId),
          ne(orders.status, "delivered"),
          ne(orders.status, "cancelled")
        )
      )
      .orderBy(desc(orders.createdAt))
      .limit(20);

    const items = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, assigned.map((o) => o.id)));

    const itemsByOrder = new Map<string, typeof items>();
    for (const item of items) {
      const list = itemsByOrder.get(item.orderId) ?? [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    return ok(
      assigned.map((o) => ({
        ...o,
        items: itemsByOrder.get(o.id) ?? [],
      }))
    );
  } catch (err) {
    return serverError(err);
  }
}