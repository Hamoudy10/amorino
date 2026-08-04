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
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  days: number;
}

export function AnalyticsClient() {
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [days, setDays] = React.useState(7);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/admin/analytics?days=${days}`, { cache: "no-store" });
        const json = await res.json();
        if (json.ok) setData(json.data);
      } catch {
        // ignored
      } finally {
        setLoading(false);
      }
    })();
  }, [days]);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const hourlyData = Array.from({ length: 24 }, (_, h) => {
    const row = data.hourly.find((r) => r.hour === h);
    return { hour: `${String(h).padStart(2, "0")}:00`, orders: row?.orders ?? 0 };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>
              {d}d
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: `Orders (${data.days}d)`, value: String(data.summary.totalOrders) },
          { label: `Revenue (${data.days}d)`, value: formatKES(data.summary.revenue) },
          { label: "Average rating", value: data.rating.count > 0 ? `${data.rating.average.toFixed(1)} ★ (${data.rating.count})` : "No reviews" },
          { label: "Repeat rate", value: `${data.repeatRate}%` },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Sales</CardTitle>
            <CardDescription>Orders vs revenue per day</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.sales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value, name) =>
                    name === "revenue" ? [formatKES(Number(value)), "Revenue"] : [value, "Orders"]
                  }
                />
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
    </div>
  );
}