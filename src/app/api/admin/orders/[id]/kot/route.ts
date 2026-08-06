import { NextRequest } from "next/server";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { formatKES } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Printable Kitchen Order Ticket — 80mm thermal-printer friendly HTML.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole("owner", "admin");
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return new Response("Order not found", { status: 404 });

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

  const now = new Date();
  const readyAt = order.estimatedReadyAt
    ? new Date(order.estimatedReadyAt).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })
    : "—";

  const itemRows = items
    .map((item) => {
      const opts = (item.options ?? []).map((o) => `${o.name}`).join(", ");
      return `
        <tr>
          <td>${item.quantity}×</td>
          <td>${item.name}${opts ? `<br/><span class="opt">+ ${opts}</span>` : ""}</td>
          <td class="r">${formatKES(item.totalPrice)}</td>
        </tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>KOT ${order.orderNumber}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 72mm; color: #000; }
  .center { text-align: center; }
  h1 { font-size: 16px; margin: 2px 0; }
  .line { border-top: 1px dashed #000; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; padding: 1px 0; }
  td.r { text-align: right; }
  .opt { font-size: 10px; color: #444; }
  .meta { font-size: 11px; }
  .bold { font-weight: bold; }
  .notes { margin-top: 4px; font-size: 11px; border-top: 1px dashed #000; padding-top: 4px; }
</style>
</head>
<body onload="window.print()">
  <div class="center">
    <h1>AMORINO CAFÉ</h1>
    <div class="meta">Makadara Rd, Mombasa · 0706 090909</div>
    <div class="line"></div>
    <div class="bold">KOT — ${order.orderNumber}</div>
    <div class="meta">${now.toLocaleString("en-KE")}</div>
    <div class="meta">Type: ${order.type.toUpperCase()} · Est. ready: ${readyAt}</div>
    <div class="meta">Payment: ${(order.paymentMethod ?? "cash").toUpperCase()}</div>
    <div class="line"></div>
  </div>
  <table>${itemRows}</table>
  <div class="line"></div>
  <div class="center bold">TOTAL: ${formatKES(order.total)}</div>
  ${order.specialInstructions ? `<div class="notes">NOTES: ${order.specialInstructions}</div>` : ""}
  ${order.deliveryAddress ? `<div class="notes">DELIVER TO: ${order.deliveryAddress}</div>` : ""}
  <div class="line"></div>
  <div class="center meta">Customer: ${order.customerName} · ${order.customerPhone}</div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}