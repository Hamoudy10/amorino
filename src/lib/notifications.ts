import axios from "axios";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getSettings } from "@/lib/settings";
import { normalizePhone } from "@/lib/utils";

export type NotificationChannel = "sms" | "whatsapp" | "email" | "push";

interface SendResult {
  ok: boolean;
  error?: string;
}

export async function logNotification(input: {
  userId?: string | null;
  orderId?: string | null;
  type: NotificationChannel;
  title?: string;
  body: string;
  status?: "pending" | "sent" | "failed";
  metadata?: unknown;
}): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId ?? null,
      orderId: input.orderId ?? null,
      type: input.type,
      channel: input.type,
      title: input.title ?? null,
      body: input.body,
      status: input.status ?? "pending",
      metadata: (input.metadata as never) ?? null,
    });
  } catch {
    // Logging must never break the caller.
  }
}

// ---------------- SMS (Africa's Talking) ----------------

export async function sendSms(to: string, message: string): Promise<SendResult> {
  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME;
  if (!apiKey || !username) {
    return { ok: false, error: "Africa's Talking not configured" };
  }
  try {
    const res = await axios.post(
      "https://api.africastalking.com/version1/messaging",
      new URLSearchParams({
        username,
        to: normalizePhone(to),
        message,
        from: process.env.AT_SENDER_ID ?? "AMORINO",
      }).toString(),
      {
        headers: {
          apiKey,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 15_000,
      }
    );
    const sent = res.data?.SMSMessageData?.Recipients?.[0]?.status === "Success";
    return sent ? { ok: true } : { ok: false, error: JSON.stringify(res.data) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "SMS send failed" };
  }
}

// ---------------- WhatsApp (Meta Cloud API) ----------------

export interface WhatsAppTemplateMessage {
  to: string;
  templateName: string;
  language: string;
  components: Array<{
    type: "body" | "header" | "button";
    parameters?: Array<{ type: string; text?: string; image?: { link: string } }>;
  }>;
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  bodyParams: string[] = []
): Promise<SendResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return { ok: false, error: "WhatsApp not configured" };
  }
  try {
    const res = await axios.post(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: normalizePhone(to),
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" },
          components: bodyParams.length
            ? [{ type: "body", parameters: bodyParams.map((text) => ({ type: "text", text })) }]
            : undefined,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 15_000,
      }
    );
    return res.status < 300 ? { ok: true } : { ok: false, error: JSON.stringify(res.data) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "WhatsApp send failed" };
  }
}

export function whatsappDeepLink(text: string): string {
  const phone = process.env.WHATSAPP_BUSINESS_PHONE ?? "254706090909";
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

// ---------------- Email (Resend) ----------------

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Resend not configured" };
  }
  try {
    const res = await axios.post(
      "https://api.resend.com/emails",
      {
        from: "Amorino Café <orders@amorinocafe.co.ke>",
        to: [input.to],
        subject: input.subject,
        html: input.html,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15_000,
      }
    );
    return res.status < 300 ? { ok: true } : { ok: false, error: JSON.stringify(res.data) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Email send failed" };
  }
}

// ---------------- Order status notifications ----------------

const STATUS_MESSAGES: Record<string, { sms: string; whatsapp: string; title: string }> = {
  confirmed: {
    sms: "Amorino Café: Order {order} confirmed. We are preparing your food! Estimated ready in ~{eta} min.",
    whatsapp: "Your Amorino order {order} is confirmed ✅ We are preparing your food! Estimated ready in ~{eta} min.",
    title: "Order confirmed",
  },
  preparing: {
    sms: "Amorino Café: Order {order} is being prepared by our chefs. Hang tight!",
    whatsapp: "👨‍🍳 Your order {order} is being prepared by our chefs!",
    title: "Preparing your order",
  },
  ready: {
    sms: "Amorino Café: Order {order} is ready! Come pick it up or wait for the rider.",
    whatsapp: "🎉 Your order {order} is ready! Our rider is on the way (delivery) or collect at the counter (pickup).",
    title: "Order ready",
  },
  out_for_delivery: {
    sms: "Amorino Café: Order {order} is out for delivery. Track it live on our website.",
    whatsapp: "🛵 Your order {order} is out for delivery! Track your rider live: {trackUrl}",
    title: "Out for delivery",
  },
  delivered: {
    sms: "Amorino Café: Order {order} delivered. Thank you! Rate us here: {reviewUrl}",
    whatsapp: "🍽️ Order {order} delivered! Enjoy your meal. Please leave us a review: {reviewUrl}",
    title: "Order delivered",
  },
  picked_up: {
    sms: "Amorino Café: Order {order} picked up. Thank you! Rate us here: {reviewUrl}",
    whatsapp: "🍽️ Order {order} picked up. Enjoy! Please leave us a review: {reviewUrl}",
    title: "Order picked up",
  },
  cancelled: {
    sms: "Amorino Café: Order {order} was cancelled. Refund will be processed if already paid.",
    whatsapp: "Order {order} was cancelled. Refund will be processed if already paid.",
    title: "Order cancelled",
  },
};

function fillTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

export async function notifyOrderStatus(input: {
  orderId: string;
  orderNumber: string;
  customerPhone: string;
  customerEmail?: string | null;
  userId?: string | null;
  status: string;
  etaMinutes?: number | null;
}): Promise<void> {
  const template = STATUS_MESSAGES[input.status];
  if (!template) return;
  const s = await getSettings();
  const trackUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/track/${input.orderNumber}`;
  const reviewUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/review/${input.orderNumber}`;
  const vars = {
    order: input.orderNumber,
    eta: String(input.etaMinutes ?? ""),
    trackUrl,
    reviewUrl,
  };

  const common = {
    userId: input.userId,
    orderId: input.orderId,
  };

  if (s.notifications.smsOnOrder) {
    const result = await sendSms(input.customerPhone, fillTemplate(template.sms, vars));
    await logNotification({
      ...common,
      type: "sms",
      title: template.title,
      body: fillTemplate(template.sms, vars),
      status: result.ok ? "sent" : "failed",
      metadata: { error: result.error },
    });
  }
  if (s.notifications.whatsappOnOrder) {
    const result = await sendWhatsAppTemplate(input.customerPhone, "order_status_update", [
      input.orderNumber,
      template.title,
    ]);
    await logNotification({
      ...common,
      type: "whatsapp",
      title: template.title,
      body: fillTemplate(template.whatsapp, vars),
      status: result.ok ? "sent" : "failed",
      metadata: { error: result.error },
    });
  }
  if (s.notifications.emailReceipt && input.customerEmail) {
    const result = await sendEmail({
      to: input.customerEmail,
      subject: `Amorino Café — ${template.title} (${input.orderNumber})`,
      html: `<p>Hi there,</p><p>${fillTemplate(template.whatsapp, vars)}</p><p>Track your order: <a href="${trackUrl}">${trackUrl}</a></p><p>— Amorino Café, Makadara Rd, Mombasa</p>`,
    });
    await logNotification({
      ...common,
      type: "email",
      title: template.title,
      body: fillTemplate(template.whatsapp, vars),
      status: result.ok ? "sent" : "failed",
      metadata: { error: result.error },
    });
  }
}
