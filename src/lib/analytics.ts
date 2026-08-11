import { and, desc, eq, gte, lte, sql, sum, count, avg, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderItems, reviews, complaints, users } from "@/db/schema";

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

export interface DateRange {
  from: Date;
  to: Date;
}

export interface RangeInput {
  days?: number;
  from?: Date;
  to?: Date;
}

/** Resolves a range from either a `days` convenience or explicit from/to. */
export function resolveRange(input: RangeInput): DateRange {
  if (input.from && input.to) {
    return { from: input.from, to: input.to };
  }
  const days = input.days ?? 7;
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

/** Orders/revenue for an arbitrary range (drives the analytics summary cards). */
export async function getRangeSummary(input: RangeInput): Promise<{ totalOrders: number; revenue: number; avgOrderValue: number }> {
  const { from, to } = resolveRange(input);
  const [row] = await db
    .select({
      totalOrders: count(orders.id),
      revenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} NOT IN ('cancelled','pending_payment') THEN ${orders.total}::numeric ELSE 0 END), 0)`,
      avgOrderValue: sql<number>`COALESCE(AVG(CASE WHEN ${orders.status} NOT IN ('cancelled','pending_payment') THEN ${orders.total}::numeric END), 0)`,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to)));
  return {
    totalOrders: row?.totalOrders ?? 0,
    revenue: Number(row?.revenue ?? 0),
    avgOrderValue: Number(row?.avgOrderValue ?? 0),
  };
}

export interface DailySalesRow {
  date: string;
  totalOrders: number;
  revenue: number;
}

export async function getSalesByDay(input: RangeInput = {}): Promise<DailySalesRow[]> {
  const { from } = resolveRange(input);
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

export async function getRevenueByHour(input: RangeInput = {}): Promise<HourlyVolumeRow[]> {
  const { from } = resolveRange(input);
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

export async function getTopItems(input: RangeInput = {}, limit = 10): Promise<TopItemRow[]> {
  const { from } = resolveRange(input);
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

export async function getPaymentMethodSplit(input: RangeInput = {}): Promise<SplitRow[]> {
  const { from } = resolveRange(input);
  const rows = await db
    .select({ label: orders.paymentMethod, value: count(orders.id) })
    .from(orders)
    .where(and(gte(orders.createdAt, from), sql`${orders.status} NOT IN ('cancelled','pending_payment')`))
    .groupBy(orders.paymentMethod);
  return rows.map((r) => ({ label: r.label ?? "other", value: r.value }));
}

export async function getOrderTypeSplit(input: RangeInput = {}): Promise<SplitRow[]> {
  const { from } = resolveRange(input);
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
  riderPhone: string | null;
  riderEmail: string | null;
  deliveries: number;
  avgDeliveryMinutes: number | null;
}

export async function getRiderPerformance(input: RangeInput = {}): Promise<RiderPerformanceRow[]> {
  const { from } = resolveRange(input);
  const rows = await db
    .select({
      riderId: orders.riderId,
      riderName: users.name,
      riderPhone: users.phone,
      riderEmail: users.email,
      deliveries: count(orders.id),
      avgDeliveryMinutes: sql<number | null>`AVG(EXTRACT(EPOCH FROM (${orders.deliveredAt} - ${orders.createdAt}))/60)`,
    })
    .from(orders)
    .leftJoin(users, eq(orders.riderId, users.id))
    .where(and(gte(orders.createdAt, from), eq(orders.status, "delivered")))
    .groupBy(orders.riderId, users.name, users.phone, users.email)
    .orderBy(sql`COUNT(${orders.id}) DESC`);
  return rows.map((r) => ({
    riderId: r.riderId ?? "",
    riderName: r.riderName,
    riderPhone: r.riderPhone,
    riderEmail: r.riderEmail,
    deliveries: r.deliveries,
    avgDeliveryMinutes: r.avgDeliveryMinutes === null ? null : Math.round(Number(r.avgDeliveryMinutes)),
  }));
}

export async function getRepeatRate(input: RangeInput = {}): Promise<number> {
  const { from } = resolveRange(input);
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

/** Approved reviews for the public homepage, with reviewer names. */
export async function getHomeReviews(limit = 6) {
  return db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      reply: reviews.reply,
      createdAt: reviews.createdAt,
      reviewerName: orders.customerName,
      orderNumber: orders.orderNumber,
    })
    .from(reviews)
    .leftJoin(orders, eq(reviews.orderId, orders.id))
    .where(eq(reviews.isVisible, true))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
}

// ---------- Revenue forecast (simple linear regression) ----------

export interface ForecastPoint {
  date: string;
  actual: number | null;
  forecast: number | null;
  lower: number | null;
  upper: number | null;
}

export async function getRevenueForecast(historyDays = 30, horizon = 7): Promise<{
  points: ForecastPoint[];
  next7: { date: string; value: number; lower: number; upper: number }[];
}> {
  const { from } = resolveRange({ days: historyDays });
  const rows = await db
    .select({
      date: sql<string>`DATE(${orders.createdAt})::text`,
      revenue: sql<number>`COALESCE(SUM(${orders.total}::numeric), 0)`,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, from), sql`${orders.status} NOT IN ('cancelled','pending_payment')`))
    .groupBy(sql`DATE(${orders.createdAt})`)
    .orderBy(sql`DATE(${orders.createdAt})`);

  const byDate = new Map(rows.map((r) => [r.date, Number(r.revenue)]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build a dense daily series (missing days = 0 revenue).
  const series: { x: number; y: number; date: string }[] = [];
  for (let i = historyDays - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400_000);
    const key = d.toISOString().slice(0, 10);
    const y = byDate.get(key) ?? 0;
    series.push({ x: series.length, y, date: key });
  }

  // Least-squares linear regression.
  const n = series.length;
  const meanX = series.reduce((s, p) => s + p.x, 0) / n;
  const meanY = series.reduce((s, p) => s + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of series) {
    num += (p.x - meanX) * (p.y - meanY);
    den += (p.x - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  // Standard error of the estimate → confidence band.
  const residuals = series.map((p) => p.y - (intercept + slope * p.x));
  const se = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, n - 2));

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const points: ForecastPoint[] = series.map((p) => ({
    date: p.date,
    actual: p.y,
    forecast: null,
    lower: null,
    upper: null,
  }));

  const next7: { date: string; value: number; lower: number; upper: number }[] = [];
  for (let i = 1; i <= horizon; i++) {
    const x = series.length - 1 + i;
    const value = Math.max(0, intercept + slope * x);
    const band = Math.max(0, se * 1.96);
    const d = new Date(today.getTime() + i * 86400_000);
    next7.push({ date: fmt(d), value: Math.round(value), lower: Math.max(0, Math.round(value - band)), upper: Math.round(value + band) });
    points.push({ date: fmt(d), actual: null, forecast: Math.round(value), lower: Math.max(0, Math.round(value - band)), upper: Math.round(value + band) });
  }

  return { points, next7 };
}

// ---------- Menu engineering matrix ----------

export interface MenuMatrixRow {
  name: string;
  unitsSold: number;
  revenue: number;
  avgPrice: number;
  quadrant: "star" | "plowhorse" | "puzzle" | "dog";
}

export async function getMenuEngineering(input: RangeInput = {}, limit = 60): Promise<MenuMatrixRow[]> {
  const { from } = resolveRange(input);
  const rows = await db
    .select({
      name: orderItems.name,
      unitsSold: sql<number>`SUM(${orderItems.quantity})`,
      revenue: sql<number>`COALESCE(SUM(${orderItems.totalPrice}::numeric), 0)`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(gte(orders.createdAt, from), sql`${orders.status} NOT IN ('cancelled','pending_payment')`))
    .groupBy(orderItems.name)
    .orderBy(sql`SUM(${orderItems.quantity}) DESC`)
    .limit(limit);

  const data: MenuMatrixRow[] = rows.map((r) => ({
    name: r.name,
    unitsSold: r.unitsSold,
    revenue: Number(r.revenue),
    avgPrice: r.unitsSold > 0 ? Number(r.revenue) / r.unitsSold : 0,
    quadrant: "dog",
  }));

  if (data.length === 0) return data;
  const unitsSorted = [...data.map((d) => d.unitsSold)].sort((a, b) => a - b);
  const priceSorted = [...data.map((d) => d.avgPrice)].sort((a, b) => a - b);
  const medianUnits = unitsSorted[Math.floor(unitsSorted.length / 2)] || 1;
  const medianPrice = priceSorted[Math.floor(priceSorted.length / 2)] || 1;

  for (const d of data) {
    const highVolume = d.unitsSold >= medianUnits;
    const highMargin = d.avgPrice >= medianPrice;
    d.quadrant = highVolume ? (highMargin ? "star" : "plowhorse") : highMargin ? "puzzle" : "dog";
  }
  return data;
}

// ---------- Delivery zone heatmap ----------

export async function getDeliveryHeatmap(input: RangeInput = {}, limit = 2000) {
  const { from } = resolveRange(input);
  const rows = await db
    .select({ lat: orders.deliveryLat, lng: orders.deliveryLng })
    .from(orders)
    .where(and(gte(orders.createdAt, from), sql`${orders.deliveryLat} IS NOT NULL AND ${orders.deliveryLng} IS NOT NULL`))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
  return rows
    .map((r) => ({ lat: Number(r.lat), lng: Number(r.lng) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) < 90 && Math.abs(p.lng) < 180);
}

// ---------- Customer segmentation ----------

export interface CustomerSegment {
  segment: "champions" | "loyal" | "at_risk" | "lost" | "new" | "one_time";
  label: string;
  count: number;
  customers: Array<{
    phone: string;
    name: string | null;
    email: string | null;
    orders: number;
    revenue: number;
    lastOrderAt: string | null;
  }>;
}

const SEGMENT_META: Record<CustomerSegment["segment"], string> = {
  champions: "Champions — 5+ orders, ordered within 14 days",
  loyal: "Loyal — 3–4 orders, ordered within 30 days",
  at_risk: "At Risk — 3+ orders, last order 31–60 days ago",
  lost: "Lost — 3+ orders, last order over 60 days ago",
  new: "New — 1 order within 7 days",
  one_time: "One-time — 1 order, over 30 days ago",
};

export async function getCustomerSegments(): Promise<CustomerSegment[]> {
  const rows = await db
    .select({
      customerPhone: orders.customerPhone,
      customerName: orders.customerName,
      customerEmail: orders.customerEmail,
      count: count(orders.id),
      revenue: sql<number>`COALESCE(SUM(${orders.total}::numeric), 0)`,
      lastOrderAt: sql<string | null>`MAX(${orders.createdAt})::text`,
    })
    .from(orders)
    .where(sql`${orders.status} NOT IN ('cancelled','pending_payment')`)
    .groupBy(orders.customerPhone, orders.customerName, orders.customerEmail)
    .orderBy(sql`MAX(${orders.createdAt}) DESC`);

  const now = Date.now();
  const DAY = 86400_000;
  const segments = new Map<CustomerSegment["segment"], CustomerSegment>();
  for (const seg of Object.keys(SEGMENT_META) as CustomerSegment["segment"][]) {
    segments.set(seg, { segment: seg, label: SEGMENT_META[seg], count: 0, customers: [] });
  }

  for (const r of rows) {
    if (!r.customerPhone) continue;
    const ordersCount = r.count;
    const daysSinceLast = r.lastOrderAt ? Math.floor((now - new Date(r.lastOrderAt).getTime()) / DAY) : Number.MAX_SAFE_INTEGER;
    let seg: CustomerSegment["segment"];
    if (ordersCount >= 5 && daysSinceLast < 14) seg = "champions";
    else if (ordersCount >= 3 && ordersCount <= 4 && daysSinceLast < 30) seg = "loyal";
    else if (ordersCount >= 3 && daysSinceLast >= 31 && daysSinceLast <= 60) seg = "at_risk";
    else if (ordersCount >= 3 && daysSinceLast > 60) seg = "lost";
    else if (ordersCount === 1 && daysSinceLast < 7) seg = "new";
    else seg = "one_time";

    const bucket = segments.get(seg)!;
    bucket.count += 1;
    bucket.customers.push({
      phone: r.customerPhone,
      name: r.customerName,
      email: r.customerEmail,
      orders: ordersCount,
      revenue: Number(r.revenue),
      lastOrderAt: r.lastOrderAt,
    });
  }

  // Keep member lists bounded for payload sanity.
  for (const seg of segments.values()) {
    seg.customers = seg.customers.slice(0, 500);
  }

  return [...segments.values()];
}