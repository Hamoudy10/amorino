"use client";

import * as React from "react";
import Link from "next/link";
import { ShoppingBag, Wallet, TrendingUp, Activity, AlertTriangle, Star, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatKES, formatDateTime } from "@/lib/utils";

interface Summary {
  totalOrders: number;
  revenue: number;
  avgOrderValue: number;
  activeOrders: number;
  pendingComplaints: number;
}

interface ReviewRow {
  id: string;
  orderNumber: string | null;
  rating: number;
  comment: string | null;
  isVisible: boolean;
  createdAt: string;
}

interface ComplaintRow {
  id: string;
  orderNumber: string | null;
  category: string;
  status: string;
  description: string;
  createdAt: string;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  total: string;
  createdAt: string;
}

export function AdminOverview() {
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [orders, setOrders] = React.useState<RecentOrder[]>([]);
  const [reviews, setReviews] = React.useState<ReviewRow[]>([]);
  const [complaints, setComplaints] = React.useState<ComplaintRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    void (async () => {
      try {
        const [sumRes, orderRes, reviewRes, compRes] = await Promise.all([
          fetch("/api/admin/analytics?days=1", { cache: "no-store" }),
          fetch("/api/admin/orders?limit=8", { cache: "no-store" }),
          fetch("/api/admin/reviews", { cache: "no-store" }),
          fetch("/api/admin/complaints?status=open", { cache: "no-store" }),
        ]);
        const sumJson = await sumRes.json();
        const orderJson = await orderRes.json();
        const reviewJson = await reviewRes.json();
        const compJson = await compRes.json();
        setSummary(sumJson.ok ? sumJson.data.summary : null);
        setOrders(orderJson.ok && Array.isArray(orderJson.data) ? orderJson.data : []);
        setReviews(reviewJson.ok && Array.isArray(reviewJson.data) ? reviewJson.data : []);
        setComplaints(compJson.ok && Array.isArray(compJson.data) ? compJson.data : []);
      } catch {
        // handled by empty states
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const stats = [
    { label: "Today's Orders", value: String(summary?.totalOrders ?? 0), icon: ShoppingBag },
    { label: "Today's Revenue", value: formatKES(summary?.revenue ?? 0), icon: Wallet },
    { label: "Avg Order Value", value: formatKES(summary?.avgOrderValue ?? 0), icon: TrendingUp },
    { label: "Active Orders", value: String(summary?.activeOrders ?? 0), icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recent Orders</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/orders">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {orders.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
            )}
            {orders.slice(0, 6).map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {o.orderNumber} · {o.customerName}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary">{o.status.replace(/_/g, " ")}</Badge>
                  <span className="font-semibold">{formatKES(o.total)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" /> Open Complaints
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {complaints.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No open complaints.
                </p>
              )}
              {complaints.slice(0, 4).map((c) => (
                <div key={c.id} className="rounded-lg border p-3 text-sm">
                  <div className="mb-1 flex justify-between gap-2">
                    <span className="font-medium capitalize">{c.category.replace(/_/g, " ")}</span>
                    <span className="text-xs text-muted-foreground">{c.orderNumber ?? "—"}</span>
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
                </div>
              ))}
              {complaints.length > 0 && (
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/admin/complaints">Manage complaints</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" /> Latest Reviews
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reviews.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No reviews yet — they appear after delivery.
                </p>
              )}
              {reviews.slice(0, 3).map((r) => (
                <div key={r.id} className="rounded-lg border p-3 text-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`}
                        />
                      ))}
                    </span>
                    <span className="text-xs text-muted-foreground">{r.orderNumber ?? "—"}</span>
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{r.comment ?? "No comment"}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}