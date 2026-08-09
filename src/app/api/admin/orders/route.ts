import { NextRequest } from "next/server";
import { db } from "@/db";
import { orders, orderItems, users, activityLogs } from "@/db/schema";
import { and, asc, desc, eq, gte, lte, or, inArray, notInArray, sql } from "drizzle-orm";
import { adminOrderUpdateSchema, riderAssignmentSchema } from "@/lib/validators";
import { ok, fail, serverError, unauthorized, forbidden } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { updateOrderStatus, assignRider } from "@/lib/orders";

export const dynamic = "force-dynamic";

const FINAL_STATUSES = ["delivered", "picked_up", "cancelled"] as const;

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("owner", "admin");
    if (!user) return unauthorized();

    const params = req.nextUrl.searchParams;
    const status = params.get("status");
    const type = params.get("type");
    const q = params.get("q");
    const from = params.get("from");
    const to = params.get("to");

    const conditions = [];
    // "active" (default) = all non-terminal orders — the kanban only ever
    // shows work in progress, so the board never grows without bound.
    if (!status || status === "active") {
      conditions.push(notInArray(orders.status, FINAL_STATUSES));
    } else if (status !== "all") {
      conditions.push(eq(orders.status, status as never));
    }
    if (type && type !== "all") conditions.push(eq(orders.type, type as never));
    if (from) conditions.push(gte(orders.createdAt, new Date(from)));
    if (to) conditions.push(lte(orders.createdAt, new Date(to)));
    if (q) {
      conditions.push(
        or(
          sql`${orders.orderNumber} ILIKE ${`%${q}%`}`,
          sql`${orders.customerName} ILIKE ${`%${q}%`}`,
          sql`${orders.customerPhone} ILIKE ${`%${q}%`}`
        )!
      );
    }

    const rows = await db
      .select({
        order: orders,
        riderName: users.name,
      })
      .from(orders)
      .leftJoin(users, eq(orders.riderId, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(orders.createdAt))
      .limit(Math.min(100, Math.max(1, Number(params.get("limit") ?? 100))));

    const items = rows.length
      ? await db
          .select()
          .from(orderItems)
          .where(inArray(orderItems.orderId, rows.map((r) => r.order.id)))
      : [];

    const itemsByOrder = new Map<string, typeof items>();
    for (const item of items) {
      const list = itemsByOrder.get(item.orderId) ?? [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    const data = rows.map((r) => ({
      ...r.order,
      riderName: r.riderName,
      items: itemsByOrder.get(r.order.id) ?? [],
    }));

    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireRole("owner", "admin");
    if (!user) return unauthorized();

    const body = await req.json().catch(() => null);
    const parsed = adminOrderUpdateSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid update data", 400, parsed.error.flatten());

    await updateOrderStatus({
      orderId: parsed.data.orderId,
      status: parsed.data.status,
      actorUserId: user.id,
    });

    if (parsed.data.riderId !== undefined) {
      await assignRider({
        orderId: parsed.data.orderId,
        riderId: parsed.data.riderId,
        actorUserId: user.id,
      });
    }

    return ok({ updated: true });
  } catch (err) {
    return serverError(err);
  }
}