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
  getRevenueForecast,
  getMenuEngineering,
  getDeliveryHeatmap,
  resolveRange,
} from "@/lib/analytics";
import { ok, serverError, unauthorized } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { cacheGet, cacheSet } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * Analytics with a flexible date range: `?days=7` (preset) OR
 * `?from=YYYY-MM-DD&to=YYYY-MM-DD` (custom). Range drives every dataset.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("owner", "admin");
    if (!user) return unauthorized();

    const sp = req.nextUrl.searchParams;
    const days = Math.min(365, Math.max(1, Number(sp.get("days") ?? 7)));
    const fromRaw = sp.get("from");
    const toRaw = sp.get("to");

    let from: Date | undefined;
    let to: Date | undefined;
    if (fromRaw && toRaw) {
      from = new Date(`${fromRaw}T00:00:00`);
      to = new Date(`${toRaw}T23:59:59`);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
        return ok({ error: "Invalid date range" }, 400);
      }
    }

    const range = resolveRange({ days, from, to });
    const cacheKey = `analytics:${fromRaw ? `${fromRaw}:${toRaw}` : days}`;

    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) return ok(cached);

    const [summary, sales, hourly, topItems, paymentSplit, orderSplit, riders, repeatRate, rating, forecast, menuMatrix, heatmap] =
      await Promise.all([
        getTodaySummary(),
        getSalesByDay({ days, from, to }),
        getRevenueByHour({ days, from, to }),
        getTopItems({ days, from, to }),
        getPaymentMethodSplit({ days, from, to }),
        getOrderTypeSplit({ days, from, to }),
        getRiderPerformance({ days, from, to }),
        getRepeatRate({ days, from, to }),
        getAverageRating(),
        getRevenueForecast(30, 7),
        getMenuEngineering({ days, from, to }),
        getDeliveryHeatmap({ days, from, to }),
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
      forecast,
      menuMatrix,
      heatmap,
      range: { from: range.from.toISOString().slice(0, 10), to: range.to.toISOString().slice(0, 10), days: fromRaw ? undefined : days },
      generatedAt: new Date().toISOString(),
    };

    await cacheSet(cacheKey, data, 3600);
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}