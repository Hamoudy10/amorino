import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client = createClient(url, key);
  return client;
}

export function isRealtimeConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export interface OrderChangePayload {
  orderId: string;
  orderNumber: string;
  status: string;
  updatedAt: string;
  action?: string;
}

/**
 * Emits a realtime event for an order change. Clients subscribe via the
 * `order:<id>` Supabase channel. Falls back to no-op when Supabase is not
 * configured (the client then relies on polling).
 */
export async function emitOrderEvent(event: OrderChangePayload): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb
      .channel(`order-events-${Math.random().toString(36).slice(2)}`)
      .send({
        type: "broadcast",
        event: "order:update",
        payload: event,
      });
  } catch {
    // Realtime is best-effort; clients poll as fallback.
  }
}

export function subscribeToOrder(
  orderId: string,
  callback: (payload: OrderChangePayload) => void
): (() => void) | null {
  const sb = getSupabase();
  if (!sb) return null;
  const channel = sb
    .channel(`order:${orderId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        callback({
          orderId: String(row.id),
          orderNumber: String(row.order_number ?? ""),
          status: String(row.status ?? ""),
          updatedAt: String(row.updated_at ?? new Date().toISOString()),
        });
      }
    )
    .subscribe();
  return () => {
    sb.removeChannel(channel);
  };
}

/**
 * All-orders listener (admin board): fires on every insert/update of the
 * orders table with the event type and the changed row.
 */
export function subscribeToAllOrders(
  callback: (eventType: "INSERT" | "UPDATE", payload: OrderChangePayload) => void
): (() => void) | null {
  const sb = getSupabase();
  if (!sb) return null;
  const channel = sb
    .channel("orders:all")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "orders" },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        callback("INSERT", {
          orderId: String(row.id),
          orderNumber: String(row.order_number ?? ""),
          status: String(row.status ?? ""),
          updatedAt: String(row.created_at ?? new Date().toISOString()),
        });
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "orders" },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        callback("UPDATE", {
          orderId: String(row.id),
          orderNumber: String(row.order_number ?? ""),
          status: String(row.status ?? ""),
          updatedAt: String(row.updated_at ?? new Date().toISOString()),
        });
      }
    )
    .subscribe();
  return () => {
    sb.removeChannel(channel);
  };
}
