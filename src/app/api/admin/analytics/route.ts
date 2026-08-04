import { NextRequest } from "next/server";
import {
  getTodaySummary,
  getSalesByDay,
  getRevenueByHour,
  getTopItems,
  getPaymentMethodSplit,
  getOrderTypeSplit,
  getRiderPerformance,
  getRepeatRate,
  getAverageRating,
} from "@/lib/analytics";
import { ok, serverError, unauthorized } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { cacheGet, cacheSet } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("owner", "admin");
    if (!user) return unauthorized();

    const days = Math.min(90, Math.max(1, Number(req.nextUrl.searchParams.get("days") ?? 7)));

    const cached = await cacheGet<unknown>(`analytics:${days}`);
    if (cached) return ok(cached);

    const [summary, sales, hourly, topItems, paymentSplit, orderSplit, riders, repeatRate, rating] =
      await Promise.all([
        getTodaySummary(),
        getSalesByDay(days),
        getRevenueByHour(days),
        getTopItems(days),
        getPaymentMethodSplit(days),
        getOrderTypeSplit(days),
        getRiderPerformance(days),
        getRepeatRate(days),
        getAverageRating(),
      ]);

    const data = {
      summary,
      sales,
      hourly,
      topItems,
      paymentSplit,
      orderSplit,
      riders,
      repeatRate,
      rating,
      days,
      generatedAt: new Date().toISOString(),
    };

    await cacheSet(`analytics:${days}`, data, 3600);
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}