import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { upsertUserFromClerk } from "@/lib/auth";

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    phone_numbers?: Array<{ phone_number: string }>;
    first_name?: string | null;
    last_name?: string | null;
    public_metadata?: Record<string, unknown>;
  };
}

export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CLERK_WEBHOOK_SECRET is not configured" },
      { status: 500 }
    );
  }

  const payload = await req.text();
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ ok: false, error: "Missing svix headers" }, { status: 400 });
  }

  let event: ClerkWebhookEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as unknown as ClerkWebhookEvent;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 });
  }

  try {
    const d = event.data;
    if (event.type === "user.created" || event.type === "user.updated") {
      await upsertUserFromClerk({
        clerkId: d.id,
        email: d.email_addresses?.[0]?.email_address ?? null,
        phone: d.phone_numbers?.[0]?.phone_number ?? null,
        name: d.first_name || d.last_name ? `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() : null,
        role: (d.public_metadata?.role as "customer" | "owner" | "admin" | "rider") ?? undefined,
      });
    } else if (event.type === "user.deleted") {
      // Order history is linked to phone, so we keep the row and just clear the
      // Clerk link so a re-registered user is not attached to old data.
      const { db } = await import("@/db");
      const { users } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(users).set({ clerkId: null, updatedAt: new Date() }).where(eq(users.clerkId, d.id));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Clerk webhook sync error:", err);
    return NextResponse.json({ ok: false, error: "Sync failed" }, { status: 500 });
  }
}