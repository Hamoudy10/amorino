import { NextRequest } from "next/server";
import { db } from "@/db";
import { complaints, orders, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { complaintAdminSchema } from "@/lib/validators";
import { ok, fail, serverError, unauthorized } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { sendWhatsAppTemplate, logNotification } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("owner", "admin");
    if (!user) return unauthorized();

    const status = req.nextUrl.searchParams.get("status");

    const rows = await db
      .select({
        complaint: complaints,
        orderNumber: orders.orderNumber,
        assignedName: users.name,
      })
      .from(complaints)
      .leftJoin(orders, eq(complaints.orderId, orders.id))
      .leftJoin(users, eq(complaints.assignedTo, users.id))
      .where(status && status !== "all" ? eq(complaints.status, status as never) : undefined)
      .orderBy(desc(complaints.createdAt))
      .limit(200);

    return ok(rows.map((r) => ({ ...r.complaint, orderNumber: r.orderNumber ?? null, assignedName: r.assignedName ?? null })));
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireRole("owner", "admin");
    if (!user) return unauthorized();

    const body = await req.json().catch(() => null);
    const parsed = complaintAdminSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid complaint data", 400, parsed.error.flatten());

    const [updated] = await db
      .update(complaints)
      .set({
        status: parsed.data.status,
        assignedTo: parsed.data.assignedTo ?? null,
        resolution: parsed.data.resolution ?? null,
        updatedAt: new Date(),
      })
      .where(eq(complaints.id, parsed.data.complaintId))
      .returning();

    // Notify the customer on resolution
    if (parsed.data.status === "resolved" && updated.phone) {
      const result = await sendWhatsAppTemplate(updated.phone, "complaint_resolved", [
        updated.category ?? "other",
      ]);
      await logNotification({
        type: "whatsapp",
        title: "Complaint resolved",
        body: `Complaint ${updated.category ?? ""} resolved: ${parsed.data.resolution ?? "resolved"}`,
        status: result.ok ? "sent" : "failed",
        metadata: { error: result.error },
      });
    }

    return ok(updated);
  } catch (err) {
    return serverError(err);
  }
}