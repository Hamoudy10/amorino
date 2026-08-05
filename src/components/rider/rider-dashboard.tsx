"use client";

import * as React from "react";
import { Bike, MapPin, Navigation, RefreshCw, PhoneCall, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types";
import { formatKES, formatDateTime } from "@/lib/utils";
import { RiderMap } from "@/components/rider/rider-map";

interface RiderOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  type: "delivery" | "pickup" | "dine_in";
  customerName: string;
  customerPhone: string;
  deliveryAddress: string | null;
  deliveryLat: string | null;
  deliveryLng: string | null;
  total: string;
  createdAt: string;
  items: Array<{ name: string; quantity: number; totalPrice: string }>;
}

const RIDER_ACTIONS: Partial<Record<OrderStatus, { next: OrderStatus; label: string }>> = {
  preparing: { next: "ready", label: "Food ready" },
  ready: { next: "out_for_delivery", label: "Start delivery" },
  out_for_delivery: { next: "delivered", label: "Delivered!" },
};

export function RiderDashboard() {
  const [orders, setOrders] = React.useState<RiderOrder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tracking, setTracking] = React.useState(false);
  const [trackingOrderId, setTrackingOrderId] = React.useState<string | null>(null);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const fetchOrders = React.useCallback(async () => {
    try {
      const res = await fetch("/api/rider/orders", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setOrders(json.data);
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchOrders();
    const interval = setInterval(() => void fetchOrders(), 15_000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const updateStatus = async (order: RiderOrder, status: OrderStatus) => {
    setUpdatingId(order.id);
    try {
      const res = await fetch(`/api/rider/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? "Update failed");
        return;
      }
      toast.success(`Order ${order.orderNumber}: ${ORDER_STATUS_LABELS[status]}`);
      await fetchOrders();
    } catch {
      toast.error("Network error");
    } finally {
      setUpdatingId(null);
    }
  };

  // Geolocation broadcasting
  const [shareError, setShareError] = React.useState<string>("");
  React.useEffect(() => {
    if (!tracking || !trackingOrderId) return;
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation not supported on this device");
      setTracking(false);
      return;
    }
    toast("Sharing your live location. Keep this tab open.");
    setShareError("");
    const send = async () => {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10_000,
          })
        );
        const res = await fetch("/api/rider/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: trackingOrderId,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        });
        const json = await res.json();
        if (!json.ok) setShareError(json.error ?? "Location update rejected");
      } catch {
        setShareError("Could not reach the server — check your connection");
      }
    };
    void send();
    const interval = setInterval(() => void send(), 15_000);
    return () => clearInterval(interval);
  }, [tracking, trackingOrderId]);

  const openNavigation = (order: RiderOrder) => {
    if (order.deliveryAddress) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.deliveryAddress)}`,
        "_blank"
      );
    } else if (order.deliveryLat && order.deliveryLng) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${order.deliveryLat},${order.deliveryLng}`,
        "_blank"
      );
    }
  };

  const activeOrder = orders.find((o) => o.status === "out_for_delivery") ?? orders[0] ?? null;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bike className="h-6 w-6 text-primary" /> Rider Portal
          </h1>
          <p className="text-sm text-muted-foreground">
            {orders.length} active delivery{orders.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void fetchOrders()}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {orders.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Bike className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-semibold">No active deliveries</p>
            <p className="text-sm text-muted-foreground">
              New orders assigned to you will appear here automatically.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {orders.map((order) => {
          const action = RIDER_ACTIONS[order.status];
          const isTracking = trackingOrderId === order.id;
          return (
            <Card key={order.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{order.orderNumber}</CardTitle>
                  <Badge variant={order.status === "out_for_delivery" ? "default" : "secondary"}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {order.customerName} · {formatKES(order.total)} · {formatDateTime(order.createdAt)}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {order.items.map((item, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{item.quantity}× {item.name}</span>
                      <span>{formatKES(item.totalPrice)}</span>
                    </li>
                  ))}
                </ul>

                {order.deliveryAddress && (
                  <p className="flex items-start gap-2 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {order.deliveryAddress}
                  </p>
                )}

                {order.type === "delivery" && order.deliveryLat && order.deliveryLng && (
                  <RiderMap
                    customerLat={Number(order.deliveryLat)}
                    customerLng={Number(order.deliveryLng)}
                    customerAddress={order.deliveryAddress}
                  />
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {action && (
                    <Button
                      size="sm"
                      onClick={() => void updateStatus(order, action.next)}
                      disabled={updatingId === order.id}
                      className="gap-2"
                    >
                      {updatingId === order.id && <Loader2 className="h-4 w-4 animate-spin" />}
                      {action.next === "delivered" && <CheckCircle2 className="h-4 w-4" />}
                      {action.label}
                    </Button>
                  )}
                  {order.deliveryAddress && (
                    <Button size="sm" variant="outline" onClick={() => openNavigation(order)} className="gap-2">
                      <Navigation className="h-4 w-4" /> Navigate
                    </Button>
                  )}
                  <a href={`tel:${order.customerPhone}`} className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold hover:bg-accent">
                    <PhoneCall className="h-4 w-4" /> Call customer
                  </a>
                  {order.status === "out_for_delivery" || order.status === "ready" ? (
                    <Button
                      size="sm"
                      variant={isTracking ? "success" : "secondary"}
                      onClick={() => {
                        setTrackingOrderId(isTracking ? null : order.id);
                        setTracking(!isTracking);
                      }}
                      className="ml-auto gap-2"
                    >
                      {isTracking ? (
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                        </span>
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                      {isTracking ? "Sharing live" : "Share live location"}
                    </Button>
                  ) : null}
                </div>
                {shareError && isTracking && (
                  <p className="text-xs font-medium text-destructive">{shareError}</p>
                )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {activeOrder && (
        <p className="pb-8 text-center text-xs text-muted-foreground">
          Tip: keep the live location button on while delivering so your customer can track you.
        </p>
      )}
    </div>
  );
}