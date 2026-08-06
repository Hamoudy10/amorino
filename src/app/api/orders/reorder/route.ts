import { NextRequest } from "next/server";
import { db } from "@/db";
import { orders, orderItems, menuItems } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { ok, fail, serverError } from "@/lib/api";
import { normalizePhone } from "@/lib/utils";
import { z } from "zod";

export const dynamic = "force-dynamic";

const reorderSchema = z.object({
  sourceOrderId: z.string().uuid(),
  phone: z.string().min(10).optional(),
});

/**
 * One-click reorder: returns the items from a previous order that are still
 * available (current prices, current options). The client adds them to the
 * cart. Unavailable items are reported so the UI can warn the customer.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid request", 400, parsed.error.flatten());

    const [order] = await db.select().from(orders).where(eq(orders.id, parsed.data.sourceOrderId)).limit(1);
    if (!order) return fail("Order not found", 404);
    if (parsed.data.phone && normalizePhone(order.customerPhone) !== normalizePhone(parsed.data.phone)) {
      return fail("Phone does not match this order", 403);
    }

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    const menuIds = items.map((i) => i.menuItemId).filter(Boolean) as string[];
    const menuRows = menuIds.length
      ? await db.select().from(menuItems).where(inArray(menuItems.id, menuIds))
      : [];
    const menuById = new Map(menuRows.map((m) => [m.id, m]));

    const available: Array<{ menuItemId: string; name: string; quantity: number; options: Array<{ name: string; price: number }> }> = [];
    const removed: string[] = [];

    for (const item of items) {
      const menu = item.menuItemId ? menuById.get(item.menuItemId) : undefined;
      if (!menu || !menu.isAvailable) {
        removed.push(item.name);
        continue;
      }
      available.push({
        menuItemId: item.menuItemId!,
        name: menu.name,
        quantity: item.quantity,
        options: item.options ?? [],
      });
    }

    return ok({ items: available, removed, orderNumber: order.orderNumber });
  } catch (err) {
    return serverError(err);
  }
}