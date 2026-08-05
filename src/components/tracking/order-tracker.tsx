"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  CheckCircle2,
  ChefHat,
  PackageCheck,
  Bike,
  Home,
  AlertTriangle,
  MessageCircle,
  Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DeliveryMap } from "@/components/tracking/delivery-map";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types";
import { formatKES, formatDateTime } from "@/lib/utils";
import { whatsappLink } from "@/components/ui/whatsapp-button";
import { subscribeToOrder } from "@/lib/realtime";

interface TrackData {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  type: "delivery" | "pickup" | "dine_in";
  customerName: string;
  total: string;
  paymentStatus: string | null;
  estimatedReadyAt: string | null;
  deliveryAddress: string | null;
  deliveryLat: string | null;
  deliveryLng: string | null;
  riderId: string | null;
  createdAt: string | null;
  items: Array<{ name: string; quantity: number; totalPrice: string }>;
}

const DELIVERY_STEPS: OrderStatus[] = [
  "pending_payment",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
];

const PICKUP_STEPS: OrderStatus[] = ["pending_payment", "confirmed", "preparing", "ready", "picked_up"];

const STEP_META: Record<string, { icon: typeof CreditCard; label: string }> = {
  pending_payment: { icon: CreditCard, label: "Payment" },
  confirmed: { icon: CheckCircle2, label: "Confirmed" },
  preparing: { icon: ChefHat, label: "Preparing" },
  ready: { icon: PackageCheck, label: "Ready" },
  out_for_delivery: { icon: Bike, label: "On the way" },
  delivered: { icon: Home, label: "Delivered" },
  picked_up: { icon: Home, label: "Picked up" },
};

function useOrderTracker(orderNumber: string, phone: string) {
  const [order, setOrder] = React.useState<TrackData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string>("");

  const fetchOrder = React.useCallback(async () => {
    try {
      const res = await fetch(
        `/api/orders/track?orderNumber=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(phone)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Order not found");
        setOrder(null);
        setLoading(false);
        return;
      }
      setOrder(json.data);
      setError("");
      setLoading(false);
    } catch {
      setError("Network error while fetching your order.");
      setLoading(false);
    }
  }, [orderNumber, phone]);

  React.useEffect(() => {
    void fetchOrder();
    const interval = setInterval(() => void fetchOrder(), 10_000);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  // Realtime via Supabase when available
  React.useEffect(() => {
    if (!order?.orderId) return;
    const unsubscribe = subscribeToOrder(order.orderId, (payload) => {
      setOrder((prev) => (prev ? { ...prev, status: payload.status as OrderStatus } : prev));
    });
    if (!unsubscribe) return;
    return () => unsubscribe();
  }, [order?.orderId]);

  return { order, loading, error, refresh: fetchOrder };
}

export function OrderTracker({ orderNumber, phone }: { orderNumber: string; phone: string }) {
  const { order, loading, error } = useOrderTracker(orderNumber, phone);
  const [riderPos, setRiderPos] = React.useState<{ lat: number; lng: number } | null>(null);

  const steps = order?.type === "delivery" ? DELIVERY_STEPS : PICKUP_STEPS;
  const currentIndex = order ? steps.indexOf(order.status) : -1;

  React.useEffect(() => {
    if (!order || order.status !== "out_for_delivery") {
      setRiderPos(null);
      return;
    }
    const poll = async () => {
      try {
        const res = await fetch(`/api/rider/location?orderId=${order.orderId}`, { cache: "no-store" });
        const json = await res.json();
        if (json.ok && json.data) {
          setRiderPos({ lat: Number(json.data.lat), lng: Number(json.data.lng) });
        }
      } catch {
        // ignore; map will keep last known position
      }
    };
    void poll();
    const interval = setInterval(() => void poll(), 10_000);
    return () => clearInterval(interval);
  }, [order?.orderId, order?.status]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <p className="font-semibold">Order not found</p>
          <p className="text-sm text-muted-foreground">
            {error || "Double-check the order number and phone number."}
          </p>
          <Button asChild variant="outline">
            <Link href="/track">Try again</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const cancelled = order.status === "cancelled";
  const delivered = order.status === "delivered" || order.status === "picked_up";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Order {order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            Placed {formatDateTime(order.createdAt)} · {order.type === "delivery" ? "Delivery" : order.type === "pickup" ? "Pickup" : "Dine-in"}
          </p>
        </div>
        <Badge variant={cancelled ? "destructive" : delivered ? "success" : "default"}>
          {ORDER_STATUS_LABELS[order.status]}
        </Badge>
      </div>

      {cancelled ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="font-semibold">This order was cancelled.</p>
            <p className="text-sm text-muted-foreground">
              {order.paymentStatus === "paid"
                ? "Your refund will be processed back to M-Pesa."
                : "No payment was made for this order."}
            </p>
            <Button asChild className="mt-2">
              <Link href="/menu">Order again</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Order Progress</CardTitle>
              <CardDescription>
                {order.estimatedReadyAt
                  ? `Estimated ready at ${formatDateTime(order.estimatedReadyAt)}`
                  : "We are updating your order in real time."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-6">
                <AnimatePresence initial={false}>
                  {steps.map((step, index) => {
                    const meta = STEP_META[step];
                    const Icon = meta?.icon ?? CheckCircle2;
                    const isDone = index < currentIndex;
                    const isCurrent = index === currentIndex;
                    return (
                      <motion.li
                        key={step}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.08 }}
                        className="relative flex items-start gap-4"
                      >
                        {index < steps.length - 1 && (
                          <span
                            className={`absolute left-[15px] top-8 h-[calc(100%-1px)] w-0.5 ${
                              isDone ? "bg-primary" : "bg-border"
                            }`}
                          />
                        )}
                        <motion.span
                          animate={
                            isCurrent
                              ? { scale: [1, 1.15, 1] }
                              : {}
                          }
                          transition={{ repeat: isCurrent ? Infinity : 0, duration: 1.6 }}
                          className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                            isDone || isCurrent
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-muted-foreground"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </motion.span>
                        <div className="pt-1">
                          <p className={`text-sm font-semibold ${isDone || isCurrent ? "" : "text-muted-foreground"}`}>
                            {meta?.label ?? ORDER_STATUS_LABELS[step]}
                          </p>
                          {isCurrent && (
                            <p className="text-xs text-muted-foreground">Current step — live update</p>
                          )}
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ol>
            </CardContent>
          </Card>

          {order.type === "delivery" && order.deliveryLat && order.deliveryLng && (
            <Card>
              <CardHeader>
                <CardTitle>Live Delivery Tracking</CardTitle>
                <CardDescription>
                  {order.status === "out_for_delivery"
                    ? riderPos
                      ? "Rider location updates every ~10 seconds."
                      : "Rider location appears once they start moving."
                    : "Your route from Amorino Café — rider location appears once the order is out for delivery."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DeliveryMap
                  riderLat={riderPos?.lat ?? null}
                  riderLng={riderPos?.lng ?? null}
                  customerLat={Number(order.deliveryLat)}
                  customerLng={Number(order.deliveryLng)}
                  label={
                    order.status === "out_for_delivery"
                      ? "Estimated arrival updates as the rider moves."
                      : undefined
                  }
                />
                {order.deliveryAddress && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Delivering to: <span className="font-medium text-foreground">{order.deliveryAddress}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between gap-2">
              <span className="text-muted-foreground">{item.quantity}× {item.name}</span>
              <span className="font-medium">{formatKES(item.totalPrice)}</span>
            </div>
          ))}
          <div className="my-2 border-t" />
          <div className="flex justify-between font-bold">
            <span>Total {order.paymentStatus === "paid" ? "(Paid)" : "(Pay on delivery)"}</span>
            <span>{formatKES(order.total)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-center gap-3 pb-8">
        <Button asChild variant="outline" className="gap-2">
          <a href={whatsappLink(`Hello Amorino! I need help with my order ${order.orderNumber}`)} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4 text-[#25D366]" /> Need help?
          </a>
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link href={`/complain?orderNumber=${order.orderNumber}`}>
            <AlertTriangle className="h-4 w-4" /> Report a problem
          </Link>
        </Button>
        {delivered && (
          <Button asChild className="gap-2">
            <Link href={`/review/${order.orderNumber}`}>
              <Star className="h-4 w-4" /> Leave a review
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}