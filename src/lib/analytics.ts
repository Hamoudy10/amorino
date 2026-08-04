import { and, desc, eq, gte, lte, sql, sum, count, avg, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderItems, reviews, complaints, users } from "@/db/schema";

const VALID_ORDER_STATUSES = ["cancelled", "pending_payment"];

export const ANALYTICS_SQL = `
-- Daily sales summary
CREATE OR REPLACE VIEW analytics_daily_sales AS
SELECT
  DATE(created_at) AS date,
  COUNT(*) AS total_orders,
  SUM(total::numeric)::numeric AS revenue,
  AVG(total::numeric)::numeric AS avg_order_value
FROM orders
WHERE status NOT IN ('cancelled', 'pending_payment')
GROUP BY DATE(created_at);

-- Hourly order volume
CREATE OR REPLACE VIEW analytics_hourly_volume AS
SELECT
  EXTRACT(HOUR FROM created_at)::int AS hour,
  COUNT(*) AS orders
FROM orders
GROUP BY EXTRACT(HOUR FROM created_at);

-- Top items
CREATE OR REPLACE VIEW analytics_top_items AS
SELECT
  name,
  SUM(quantity) AS total_sold,
  SUM(total_price::numeric)::numeric AS revenue
FROM order_items
GROUP BY name
ORDER BY total_sold DESC;
`;

interface DateRange {
  from: Date;
  to: Date;
}

function range(days: number): DateRange {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 3600_000);
  return { from, to };
}

export interface TodaySummary {
  totalOrders: number;
  revenue: number;
  avgOrderValue: number;
  activeOrders: number;
  pendingComplaints: number;
}

export async function getTodaySummary(): Promise<TodaySummary> {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const [orderStats] = await db
    .select({
      totalOrders: count(orders.id),
      revenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} NOT IN ('cancelled','pending_payment') THEN ${orders.total}::numeric ELSE 0 END), 0)`,
      avgOrderValue: sql<number>`COALESCE(AVG(CASE WHEN ${orders.status} NOT IN ('cancelled','pending_payment') THEN ${orders.total}::numeric END), 0)`,
      activeOrders: count(sql`CASE WHEN ${orders.status} NOT IN ('delivered','picked_up','cancelled') THEN 1 END`),
    })
    .from(orders)
    .where(gte(orders.createdAt, dayStart));

  const [comp] = await db
    .select({ count: count(complaints.id) })
    .from(complaints)
    .where(inArray(complaints.status, ["open", "escalated"]));

  return {
    totalOrders: orderStats?.totalOrders ?? 0,
    revenue: Number(orderStats?.revenue ?? 0),
    avgOrderValue: Number(orderStats?.avgOrderValue ?? 0),
    activeOrders: Number(orderStats?.activeOrders ?? 0),
    pendingComplaints: comp?.count ?? 0,
  };
}

export interface DailySalesRow {
  date: string;
  totalOrders: number;
  revenue: number;
}

export async function getSalesByDay(days = 7): Promise<DailySalesRow[]> {
  const { from } = range(days);
  const rows = await db
    .select({
      date: sql<string>`DATE(${orders.createdAt})::text`,
      totalOrders: count(orders.id),
      revenue: sql<number>`COALESCE(SUM(${orders.total}::numeric), 0)`,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, from), sql`${orders.status} NOT IN ('cancelled','pending_payment')`))
    .groupBy(sql`DATE(${orders.createdAt})`)
    .orderBy(sql`DATE(${orders.createdAt})`);
  return rows.map((r) => ({ date: r.date, totalOrders: r.totalOrders, revenue: Number(r.revenue) }));
}

export interface HourlyVolumeRow {
  hour: number;
  orders: number;
  revenue: number;
}

export async function getRevenueByHour(days = 7): Promise<HourlyVolumeRow[]> {
  const { from } = range(days);
  const rows = await db
    .select({
      hour: sql<number>`EXTRACT(HOUR FROM ${orders.createdAt})::int`,
      orders: count(orders.id),
      revenue: sql<number>`COALESCE(SUM(${orders.total}::numeric), 0)`,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, from), sql`${orders.status} NOT IN ('cancelled','pending_payment')`))
    .groupBy(sql`EXTRACT(HOUR FROM ${orders.createdAt})`)
    .orderBy(sql`EXTRACT(HOUR FROM ${orders.createdAt})`);
  return rows.map((r) => ({ hour: r.hour, orders: r.orders, revenue: Number(r.revenue) }));
}

export interface TopItemRow {
  name: string;
  totalSold: number;
  revenue: number;
}

export async function getTopItems(days = 30, limit = 10): Promise<TopItemRow[]> {
  const { from } = range(days);
  const rows = await db
    .select({
      name: orderItems.name,
      totalSold: sql<number>`SUM(${orderItems.quantity})`,
      revenue: sql<number>`COALESCE(SUM(${orderItems.totalPrice}::numeric), 0)`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(gte(orders.createdAt, from), sql`${orders.status} NOT IN ('cancelled','pending_payment')`))
    .groupBy(orderItems.name)
    .orderBy(sql`SUM(${orderItems.quantity}) DESC`)
    .limit(limit);
  return rows.map((r) => ({ name: r.name, totalSold: r.totalSold, revenue: Number(r.revenue) }));
}

export interface SplitRow {
  label: string;
  value: number;
}

export async function getPaymentMethodSplit(days = 30): Promise<SplitRow[]> {
  const { from } = range(days);
  const rows = await db
    .select({ label: orders.paymentMethod, value: count(orders.id) })
    .from(orders)
    .where(and(gte(orders.createdAt, from), sql`${orders.status} NOT IN ('cancelled','pending_payment')`))
    .groupBy(orders.paymentMethod);
  return rows.map((r) => ({ label: r.label ?? "other", value: r.value }));
}

export async function getOrderTypeSplit(days = 30): Promise<SplitRow[]> {
  const { from } = range(days);
  const rows = await db
    .select({ label: orders.type, value: count(orders.id) })
    .from(orders)
    .where(and(gte(orders.createdAt, from), sql`${orders.status} NOT IN ('cancelled','pending_payment')`))
    .groupBy(orders.type);
  return rows.map((r) => ({ label: r.label ?? "other", value: r.value }));
}

export interface RiderPerformanceRow {
  riderId: string;
  riderName: string | null;
  deliveries: number;
  avgDeliveryMinutes: number | null;
}

export async function getRiderPerformance(days = 30): Promise<RiderPerformanceRow[]> {
  const { from } = range(days);
  const rows = await db
    .select({
      riderId: orders.riderId,
      riderName: users.name,
      deliveries: count(orders.id),
      avgDeliveryMinutes: sql<number | null>`AVG(EXTRACT(EPOCH FROM (${orders.deliveredAt} - ${orders.createdAt}))/60)`,
    })
    .from(orders)
    .leftJoin(users, eq(orders.riderId, users.id))
    .where(and(gte(orders.createdAt, from), eq(orders.status, "delivered")))
    .groupBy(orders.riderId, users.name)
    .orderBy(sql`COUNT(${orders.id}) DESC`);
  return rows.map((r) => ({
    riderId: r.riderId ?? "",
    riderName: r.riderName,
    deliveries: r.deliveries,
    avgDeliveryMinutes: r.avgDeliveryMinutes === null ? null : Math.round(Number(r.avgDeliveryMinutes)),
  }));
}

export async function getRepeatRate(days = 90): Promise<number> {
  const { from } = range(days);
  const rows = await db
    .select({
      customerPhone: orders.customerPhone,
      count: count(orders.id),
    })
    .from(orders)
    .where(and(gte(orders.createdAt, from), eq(orders.status, "delivered")))
    .groupBy(orders.customerPhone)
    .having(sql`COUNT(${orders.id}) > 1`);
  const repeatCustomers = rows.length;
  const all = await db
    .select({ count: count(orders.id) })
    .from(orders)
    .where(and(gte(orders.createdAt, from), eq(orders.status, "delivered")));
  const totalCustomers = all[0]?.count ?? 0;
  if (totalCustomers === 0) return 0;
  return Math.round((repeatCustomers / totalCustomers) * 100);
}

export async function getAverageRating(): Promise<{ average: number; count: number }> {
  const [row] = await db
    .select({
      average: avg(reviews.rating),
      count: count(reviews.id),
    })
    .from(reviews)
    .where(eq(reviews.isVisible, true));
  return {
    average: row?.average === null ? 0 : Number(row?.average ?? 0),
    count: row?.count ?? 0,
  };
}

export async function getRecentReviews(limit = 10) {
  return db
    .select()
    .from(reviews)
    .where(eq(reviews.isVisible, true))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
}