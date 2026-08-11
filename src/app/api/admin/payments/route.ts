import { NextRequest } from "next/server";
import { db } from "@/db";
import { payments, orders } from "@/db/schema";
import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { ok, serverError, unauthorized } from "@/lib/api";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("owner", "admin");
    if (!user) return unauthorized();

    const status = req.nextUrl.searchParams.get("status");
    const q = req.nextUrl.searchParams.get("q");

    const conditions = [];
    if (status && status !== "all") conditions.push(eq(payments.status, status as never));
    if (q) {
      conditions.push(
        or(
          sql`${orders.orderNumber} ILIKE ${`%${q}%`}`,
          like(payments.phoneNumber, `%${q}%`),
          like(payments.mpesaReceiptNumber, `%${q}%`)
        )!
      );
    }

    const rows = await db
      .select({
        payment: payments,
        orderNumber: orders.orderNumber,
        orderStatus: orders.status,
        orderPaymentStatus: orders.paymentStatus,
        orderTotal: orders.total,
      })
      .from(payments)
      .leftJoin(orders, eq(payments.orderId, orders.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(payments.createdAt))
      .limit(200);

    const data = rows.map((r) => ({
      ...r.payment,
      orderNumber: r.orderNumber,
      orderStatus: r.orderStatus,
      orderPaymentStatus: r.orderPaymentStatus,
      orderTotal: r.orderTotal,
    }));

    const totals = await db
      .select({ method: orders.paymentMethod, total: orders.total })
      .from(orders)
      .where(inArray(orders.paymentStatus, ["paid"]));

    const byMethod: Record<string, number> = {};
    for (const t of totals) {
      byMethod[t.method ?? "cash"] = (byMethod[t.method ?? "cash"] ?? 0) + Number(t.total);
    }

    return ok({ payments: data, totalsByMethod: byMethod });
  } catch (err) {
    return serverError(err);
  }
}