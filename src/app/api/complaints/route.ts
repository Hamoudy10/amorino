import { NextRequest } from "next/server";
import { db } from "@/db";
import { complaints, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createComplaintSchema } from "@/lib/validators";
import { ok, fail, serverError } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { sendWhatsAppTemplate, logNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = createComplaintSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid complaint data", 400, parsed.error.flatten());
    }

    let orderId: string | null = null;
    if (parsed.data.orderNumber) {
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.orderNumber, parsed.data.orderNumber))
        .limit(1);
      if (!order) return fail("Order not found", 404);
      orderId = order.id;
    }

    const session = await getSessionUser();
    const [complaint] = await db
      .insert(complaints)
      .values({
        orderId,
        userId: session?.id ?? null,
        phone: parsed.data.phone,
        category: parsed.data.category,
        description: parsed.data.description,
        status: "open",
      })
      .returning();

    // Alert the owner per settings
    const s = await getSettings();
    if (s.notifications.ownerAlertPhone) {
      const result = await sendWhatsAppTemplate(
        s.notifications.ownerAlertPhone,
        "new_complaint",
        [parsed.data.category, parsed.data.orderNumber ?? "N/A"]
      );
      await logNotification({
        type: "whatsapp",
        title: "New complaint",
        body: `New ${parsed.data.category} complaint${parsed.data.orderNumber ? ` for ${parsed.data.orderNumber}` : ""}`,
        status: result.ok ? "sent" : "failed",
        metadata: { error: result.error },
      });
    }

    return ok(complaint, 201);
  } catch (err) {
    return serverError(err);
  }
}