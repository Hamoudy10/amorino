"use client";

import * as React from "react";
import { Search, RefreshCw, ChevronRight, Loader2, Printer, Volume2, VolumeX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types";
import { formatKES, formatDateTime } from "@/lib/utils";
import { subscribeToAllOrders } from "@/lib/realtime";

interface BoardOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  type: "delivery" | "pickup" | "dine_in";
  status: OrderStatus;
  paymentStatus: string | null;
  total: string;
  tip: string;
  tipRiderShare: string;
  deliveryAddress: string | null;
  riderId: string | null;
  riderName: string | null;
  createdAt: string;
  items: Array<{ name: string; quantity: number }>;
}

interface Rider {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
}

const COLUMNS: OrderStatus[] = ["pending_payment", "paid", "confirmed", "preparing", "ready", "out_for_delivery"];

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["out_for_delivery", "picked_up", "delivered"],
  out_for_delivery: ["delivered"],
  delivered: [],
  picked_up: [],
  cancelled: [],
};

export function OrderBoard() {
  const [orders, setOrders] = React.useState<BoardOrder[]>([]);
  const [riders, setRiders] = React.useState<Rider[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("active");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [muted, setMuted] = React.useState(false);

  React.useEffect(() => {
    try {
      setMuted(window.localStorage.getItem("amorino:admin-mute") === "1");
    } catch {
      // ignore
    }
  }, []);

  const fetchData = React.useCallback(async () => {
    try {
      const status = statusFilter === "all" ? "all" : statusFilter;
      const params = new URLSearchParams();
      if (status !== "active") params.set("status", status);
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/admin/orders?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setOrders(Array.isArray(json.data) ? json.data : []);
    } catch {
      // keep existing data
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter]);

  const fetchRiders = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/riders", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        // API returns { riders, candidates } — accept both shapes defensively.
        setRiders(Array.isArray(json.data) ? json.data : (json.data?.riders ?? []));
      }
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    void fetchData();
    void fetchRiders();
    const interval = setInterval(() => void fetchData(), 15_000);
    return () => clearInterval(interval);
  }, [fetchData, fetchRiders]);

  // Real-time new-order chime (muteable, persisted).
  React.useEffect(() => {
    const unsubscribe = subscribeToAllOrders((eventType) => {
      if (eventType === "INSERT") {
        void fetchData();
        try {
          const muted = window.localStorage.getItem("amorino:admin-mute") === "1";
          if (!muted) {
            const audio = new Audio("/sounds/order-chime.wav");
            void audio.play().catch(() => undefined);
          }
        } catch {
          // ignore
        }
      }
    });
    return () => unsubscribe?.();
  }, [fetchData]);

  const changeStatus = async (order: BoardOrder, status: OrderStatus) => {
    setBusyId(order.id);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, status }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? "Update failed");
        return;
      }
      toast.success(`${order.orderNumber} → ${ORDER_STATUS_LABELS[status]}`);
      await fetchData();
    } catch {
      toast.error("Network error");
    } finally {
      setBusyId(null);
    }
  };

  const assignRider = async (orderId: string, riderId: string | null) => {
    try {
      const res = await fetch("/api/admin/orders/assign-rider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, riderId }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? "Assignment failed");
        return;
      }
      toast.success(riderId ? "Rider assigned" : "Rider removed");
      await fetchData();
    } catch {
      toast.error("Network error");
    }
  };

  const grouped = COLUMNS.map((status) => ({
    status,
    orders: orders.filter((o) => o.status === status),
  }));

  const ungrouped = orders.filter((o) => !COLUMNS.includes(o.status));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search order #, name, phone…"
              className="w-56 pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => void fetchData()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const muted = window.localStorage.getItem("amorino:admin-mute") === "1";
              window.localStorage.setItem("amorino:admin-mute", muted ? "0" : "1");
              setMuted(!muted);
            }}
            title={muted ? "Unmute new-order chime" : "Mute new-order chime"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading orders…</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {grouped.map(({ status, orders: colOrders }) => (
            <div key={status} className="w-72 shrink-0">
              <div className="mb-2 flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                <span className="text-sm font-semibold">{ORDER_STATUS_LABELS[status]}</span>
                <Badge variant="secondary">{colOrders.length}</Badge>
              </div>
              <div className="space-y-3">
                {colOrders.length === 0 && (
                  <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                    Empty
                  </p>
                )}
                {colOrders.map((order) => (
                  <Card key={order.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm">{order.orderNumber}</CardTitle>
                        {order.paymentStatus === "paid" ? (
                          <Badge variant="success">Paid</Badge>
                        ) : (
                          <Badge variant="outline">Unpaid</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {order.customerName} · {order.type.replace(/_/g, " ")} · {formatDateTime(order.createdAt)}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <ul className="space-y-0.5 text-xs text-muted-foreground">
                        {order.items.slice(0, 4).map((item, i) => (
                          <li key={i}>
                            {item.quantity}× {item.name}
                          </li>
                        ))}
                        {order.items.length > 4 && <li>+{order.items.length - 4} more</li>}
                      </ul>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold tabular-nums">{formatKES(order.total)}</span>
                        {Number(order.tip) > 0 && (
                          <span className="text-xs text-muted-foreground">
                            incl. {formatKES(order.tip)} tip
                            {Number(order.tipRiderShare) > 0 && (
                              <span className="text-success"> · rider {formatKES(order.tipRiderShare)}</span>
                            )}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{order.deliveryAddress ?? "Pickup"}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={order.riderId ?? ""}
                          onValueChange={(v) => void assignRider(order.id, v === "" ? null : v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Assign rider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">— No rider —</SelectItem>
                            {riders.map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.name ?? r.phone ?? r.email ?? "Rider"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <a
                          href={`/api/admin/orders/${order.id}/kot`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Print kitchen order ticket"
                          className="inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors hover:bg-accent"
                        >
                          <Printer className="h-3.5 w-3.5" /> KOT
                        </a>
                        {TRANSITIONS[order.status]?.map((next) => (
                          <Button
                            key={next}
                            size="sm"
                            variant={next === "cancelled" ? "destructive" : "default"}
                            onClick={() => void changeStatus(order, next)}
                            disabled={busyId === order.id}
                          >
                            {busyId === order.id && <Loader2 className="h-3 w-3 animate-spin" />}
                            {ORDER_STATUS_LABELS[next]}
                            {next !== "cancelled" && <ChevronRight className="h-3 w-3" />}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {ungrouped.length > 0 && (
            <div className="w-72 shrink-0">
              <div className="mb-2 rounded-lg bg-muted px-3 py-2 text-sm font-semibold">Done / Cancelled</div>
              <div className="space-y-3">
                {ungrouped.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="space-y-2 py-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{order.orderNumber}</p>
                        <Badge variant="secondary">
                          {ORDER_STATUS_LABELS[order.status]}
                        </Badge>
                      </div>
                      {TRANSITIONS[order.status] && TRANSITIONS[order.status].length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {TRANSITIONS[order.status].map((next) => (
                            <Button
                              key={next}
                              size="sm"
                              variant={next === "cancelled" ? "destructive" : "default"}
                              onClick={() => void changeStatus(order, next)}
                              disabled={busyId === order.id}
                            >
                              {busyId === order.id && <Loader2 className="h-3 w-3 animate-spin" />}
                              {ORDER_STATUS_LABELS[next]}
                            </Button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}