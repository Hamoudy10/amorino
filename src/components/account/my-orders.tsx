"use client";

import * as React from "react";
import Link from "next/link";
import {
  PackageOpen,
  MapPin,
  ShoppingBag,
  Star,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatKES, formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_LABELS } from "@/types";

interface MyOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: string;
  createdAt: string;
  type: string;
  items: Array<{ name: string; quantity: number; totalPrice: string }>;
}

const STATUS_VARIANT: Record<string, "default" | "success" | "secondary" | "destructive" | "outline"> = {
  delivered: "success",
  picked_up: "success",
  cancelled: "destructive",
  pending_payment: "secondary",
  paid: "default",
  confirmed: "default",
  preparing: "default",
  ready: "default",
  out_for_delivery: "default",
};

export function MyOrders() {
  const [orders, setOrders] = React.useState<MyOrder[] | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchOrders = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account/orders", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setOrders(Array.isArray(json.data) ? json.data : []);
    } catch {
      // ignored
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <PackageOpen className="h-10 w-10 text-muted-foreground/40" />
            <h2 className="text-xl font-bold">No orders yet</h2>
            <p className="text-sm text-muted-foreground">
              Orders placed on this account (or with your phone number) will appear here.
            </p>
            <Button asChild>
              <Link href="/menu">Order Something Tasty</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">My Orders</h1>
        <Button size="sm" variant="outline" onClick={() => void fetchOrders()}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {orders.map((order) => (
        <Card key={order.id}>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{order.orderNumber}</span>
                <Badge variant={STATUS_VARIANT[order.status] ?? "outline"}>
                  {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS] ?? order.status}
                </Badge>
                {order.paymentStatus === "pending" && order.status === "pending_payment" && (
                  <Badge variant="outline">Unpaid</Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</span>
            </div>

            <ul className="mt-3 space-y-1 text-sm">
              {order.items.slice(0, 4).map((item, i) => (
                <li key={i} className="flex justify-between gap-2 text-muted-foreground">
                  <span className="truncate">
                    {item.quantity}× {item.name}
                  </span>
                  <span className="shrink-0">{formatKES(item.totalPrice)}</span>
                </li>
              ))}
              {order.items.length > 4 && (
                <li className="text-xs text-muted-foreground">+{order.items.length - 4} more</li>
              )}
            </ul>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  {order.type === "delivery" ? "Delivery" : order.type === "pickup" ? "Pickup" : "Dine-in"}
                </span>
                <span className="font-bold">{formatKES(order.total)}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/track/${order.orderNumber}`}>
                    <MapPin className="h-3.5 w-3.5" /> Track
                  </Link>
                </Button>
                {(order.status === "delivered" || order.status === "picked_up") && (
                  <>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/review/${order.orderNumber}`}>
                        <Star className="h-3.5 w-3.5" /> Review
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/complain?order=${order.orderNumber}`}>
                        <AlertTriangle className="h-3.5 w-3.5" /> Issue?
                      </Link>
                    </Button>
                  </>
                )}
                <Button asChild size="sm">
                  <Link href="/menu">
                    Order again <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}