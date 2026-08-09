"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend as RechartsLegend,
  ComposedChart,
  Line,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatKES } from "@/lib/utils";

const COLORS = ["#d97706", "#0f766e", "#0ea5e9", "#a855f7", "#f59e0b"];

interface AnalyticsData {
  summary: { totalOrders: number; revenue: number; avgOrderValue: number; activeOrders: number; pendingComplaints: number };
  sales: Array<{ date: string; totalOrders: number; revenue: number }>;
  hourly: Array<{ hour: number; orders: number; revenue: number }>;
  topItems: Array<{ name: string; totalSold: number; revenue: number }>;
  paymentSplit: Array<{ label: string; value: number }>;
  orderSplit: Array<{ label: string; value: number }>;
  riders: Array<{ riderName: string | null; deliveries: number; avgDeliveryMinutes: number | null }>;
  repeatRate: number;
  rating: { average: number; count: number };
  forecast: {
    points: Array<{ date: string; actual: number | null; forecast: number | null; lower: number | null; upper: number | null }>;
    next7: Array<{ date: string; value: number; lower: number; upper: number }>;
  };
  menuMatrix: Array<{ name: string; unitsSold: number; revenue: number; avgPrice: number; quadrant: string }>;
  range: { from: string; to: string; days?: number };
}

const QUADRANT_LABEL: Record<string, string> = {
  star: "Stars",
  plowhorse: "Plowhorses",
  puzzle: "Puzzles",
  dog: "Dogs",
};

const QUADRANT_COLOR: Record<string, string> = {
  star: "#d97706",
  plowhorse: "#0f766e",
  puzzle: "#a855f7",
  dog: "#9ca3af",
};

const PRESETS = [7, 30, 90];

export function AnalyticsClient() {
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [days, setDays] = React.useState(7);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [customActive, setCustomActive] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const buildUrl = React.useCallback(
    (d: number, f: string, t: string, custom: boolean) => {
      const params = new URLSearchParams();
      if (custom && f && t) {
        params.set("from", f);
        params.set("to", t);
      } else {
        params.set("days", String(d));
      }
      return `/api/admin/analytics?${params.toString()}`;
    },
    []
  );

  const load = React.useCallback(
    (d: number, f: string, t: string, custom: boolean) => {
      setLoading(true);
      setError("");
      void (async () => {
        try {
          const res = await fetch(buildUrl(d, f, t, custom), { cache: "no-store" });
          const json = await res.json();
          if (!json.ok) {
            setError(json.error ?? "Could not load analytics");
            return;
          }
          setData(json.data);
        } catch {
          setError("Network error");
        } finally {
          setLoading(false);
        }
      })();
    },
    [buildUrl]
  );

  React.useEffect(() => {
    load(days, "", "", false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyPreset = (d: number) => {
    setDays(d);
    setCustomActive(false);
    setFrom("");
    setTo("");
    load(d, "", "", false);
  };

  const applyCustom = () => {
    if (!from || !to) {
      setError("Pick both a start and end date");
      return;
    }
    setCustomActive(true);
    load(days, from, to, true);
  };

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const hourlyData = (data?.hourly ?? []).length
    ? Array.from({ length: 24 }, (_, h) => {
        const row = data!.hourly.find((r) => r.hour === h);
        return { hour: `${String(h).padStart(2, "0")}:00`, orders: row?.orders ?? 0 };
      })
    : [];

  const forecastTotal = (data?.forecast.next7 ?? []).reduce((s, p) => s + p.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            {data
              ? `Showing ${data.range.from} → ${data.range.to}${data.range.days ? ` (last ${data.range.days} days)` : ""}`
              : "Loading…"}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex gap-1">
            {PRESETS.map((d) => (
              <Button key={d} size="sm" variant={!customActive && days === d ? "default" : "outline"} onClick={() => applyPreset(d)}>
                {d}d
              </Button>
            ))}
          </div>
          <div className="flex items-end gap-1.5 rounded-lg border p-1.5">
            <div>
              <Label htmlFor="from" className="text-[10px] text-muted-foreground">From</Label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-36" />
            </div>
            <div>
              <Label htmlFor="to" className="text-[10px] text-muted-foreground">To</Label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-36" />
            </div>
            <Button size="sm" variant={customActive ? "default" : "secondary"} onClick={applyCustom}>
              Apply
            </Button>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: `Orders (${data.range.from} → ${data.range.to})`, value: String(data.summary.totalOrders) },
              { label: `Revenue (${data.range.from} → ${data.range.to})`, value: formatKES(data.summary.revenue) },
              { label: "Active orders right now", value: String(data.summary.activeOrders) },
              { label: "Open complaints", value: String(data.summary.pendingComplaints) },
              { label: "Average rating", value: data.rating.count > 0 ? `${data.rating.average.toFixed(1)} / 5 (${data.rating.count} reviews)` : "No reviews" },
              { label: "Repeat rate (range)", value: `${data.repeatRate}%` },
              { label: "Avg order value (range)", value: formatKES(data.summary.avgOrderValue) },
              { label: "Forecast · next 7 days", value: formatKES(forecastTotal) },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-xl font-bold tabular-nums">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Daily Sales</CardTitle>
                <CardDescription>Orders vs revenue per day in range</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.sales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value, name) => (name === "revenue" ? [formatKES(Number(value)), "Revenue"] : [value, "Orders"])} />
                    <RechartsLegend />
                    <Bar dataKey="totalOrders" name="Orders" fill="#d97706" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="revenue" name="Revenue" fill="#0f766e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Peak Hours</CardTitle>
                <CardDescription>Order volume by hour of day</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={2} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="orders" name="Orders" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>7-Day Revenue Forecast</CardTitle>
              <CardDescription>
                Linear regression over the last 30 days with a 95% confidence band. Bars = actual, line = forecast.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.forecast.points}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={5} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value, name) => (value === null ? [undefined, undefined] : [formatKES(Number(value)), String(name)])} />
                  <RechartsLegend />
                  <Area dataKey="upper" name="Upper bound" stroke="none" fill="#d97706" fillOpacity={0.08} />
                  <Area dataKey="lower" name="Lower bound" stroke="none" fill="#d97706" fillOpacity={0.08} />
                  <Bar dataKey="actual" name="Actual" fill="#0f766e" radius={[3, 3, 0, 0]} />
                  <Line dataKey="forecast" name="Forecast" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {data.forecast.next7.map((p) => (
                  <span key={p.date}>
                    {p.date.slice(5)}: <span className="font-semibold text-foreground">{formatKES(p.value)}</span>
                    <span className="text-muted-foreground"> ({formatKES(p.lower)}–{formatKES(p.upper)})</span>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Menu Engineering Matrix</CardTitle>
              <CardDescription>
                X = units sold · Y = average price (margin proxy). Median splits the quadrants.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex flex-wrap gap-2 text-xs">
                {(["star", "plowhorse", "puzzle", "dog"] as const).map((q) => {
                  const count = data.menuMatrix.filter((m) => m.quadrant === q).length;
                  return (
                    <span key={q} className="rounded-full border px-2 py-0.5" style={{ borderColor: QUADRANT_COLOR[q] }}>
                      <span style={{ color: QUADRANT_COLOR[q] }}>●</span> {QUADRANT_LABEL[q]}: {count}
                    </span>
                  );
                })}
              </div>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 16, right: 24, bottom: 24, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="unitsSold" name="Units sold" tick={{ fontSize: 10 }} label={{ value: "Units sold", position: "insideBottom", offset: -16, fontSize: 11 }} />
                    <YAxis type="number" dataKey="avgPrice" name="Avg price" tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatKES(v)} />
                    <ZAxis range={[60, 400]} />
                    <ReferenceLine x={data.menuMatrix.length ? medianOf(data.menuMatrix.map((m) => m.unitsSold)) : 0} stroke="#9ca3af" strokeDasharray="4 4" />
                    <ReferenceLine y={data.menuMatrix.length ? medianOf(data.menuMatrix.map((m) => m.avgPrice)) : 0} stroke="#9ca3af" strokeDasharray="4 4" />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      formatter={(value, name) =>
                        name === "avgPrice" ? [formatKES(Number(value)), "Avg price"] : [value, "Units sold"]
                      }
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ""}
                    />
                    <Scatter name="Items" data={data.menuMatrix} fill="#d97706">
                      {data.menuMatrix.map((m, i) => (
                        <Cell key={i} fill={QUADRANT_COLOR[m.quadrant]} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.paymentSplit} dataKey="value" nameKey="label" innerRadius={50} outerRadius={80} label>
                      {data.paymentSplit.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Types</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.orderSplit} dataKey="value" nameKey="label" innerRadius={50} outerRadius={80} label>
                      {data.orderSplit.map((_, i) => (
                        <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Items</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 text-sm">
                  {data.topItems.map((item, i) => (
                    <li key={item.name} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
                          {i + 1}
                        </span>
                        {item.name}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {item.totalSold} sold · {formatKES(item.revenue)}
                      </span>
                    </li>
                  ))}
                  {data.topItems.length === 0 && (
                    <li className="py-6 text-center text-muted-foreground">No sales data yet.</li>
                  )}
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rider Performance</CardTitle>
                <CardDescription>Deliveries and average time per rider</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {data.riders.map((r) => (
                  <div key={r.riderName ?? "rider"} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="font-medium">{r.riderName ?? "Unnamed rider"}</span>
                    <span className="text-muted-foreground">
                      {r.deliveries} deliveries · {r.avgDeliveryMinutes !== null ? `~${r.avgDeliveryMinutes} min avg` : "—"}
                    </span>
                  </div>
                ))}
                {data.riders.length === 0 && (
                  <p className="py-6 text-center text-muted-foreground">No completed deliveries yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}