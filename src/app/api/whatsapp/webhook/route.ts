import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { normalizePhone } from "@/lib/utils";
import { sendWhatsAppTemplate, logNotification } from "@/lib/notifications";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "amorino_verify_2026";

/**
 * Meta webhook verification (GET) — required to register the webhook.
 */
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Verification failed", { status: 403 });
}

/**
 * Incoming WhatsApp messages. Supports "Where is my order AMR-000123"
 * style inquiries: parses the order number and replies with status + ETA.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const entry = body?.entry?.[0];
  const change = entry?.changes?.[0]?.value;
  const message = change?.messages?.[0];
  const contactPhone = change?.contacts?.[0]?.wa_id ?? message?.from;

  if (change?.statuses) {
    // Delivery status updates (read/delivered) — acknowledge.
    return NextResponse.json({ ok: true });
  }

  if (!message || message.type !== "text" || !contactPhone) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const text: string = message.text?.body ?? "";
  const match = text.match(/AMR-\d{6}/i);
  const orderNumber = match ? match[0].toUpperCase() : null;

  try {
    if (orderNumber) {
      const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
      if (order) {
        await sendWhatsAppTemplate(contactPhone, "order_status_update", [
          orderNumber,
          order.status.replace(/_/g, " "),
        ]);
      } else {
        await sendWhatsAppTemplate(contactPhone, "order_not_found", [orderNumber]);
      }
    } else {
      await sendWhatsAppTemplate(contactPhone, "help_menu");
    }

    await logNotification({
      type: "whatsapp",
      title: "Incoming WhatsApp",
      body: text.slice(0, 500),
      status: "sent",
      metadata: { from: contactPhone },
    });
  } catch (err) {
    console.error("[whatsapp webhook]", err);
  }

  return NextResponse.json({ ok: true });
}