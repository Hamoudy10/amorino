import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, orders } from "@/db/schema";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { ok, fail, serverError, unauthorized } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const lockSchema = z.object({
  userId: z.string().uuid(),
  isActive: z.boolean(),
});

const deleteSchema = z.object({ userId: z.string().uuid() });

/** Every account in the system with order stats — searchable and filterable. */
export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("owner", "admin");
    if (!user) return unauthorized();

    const sp = req.nextUrl.searchParams;
    const q = sp.get("q");
    const role = sp.get("role");
    const status = sp.get("status");

    const conditions = [];
    if (q) {
      conditions.push(
        or(
          like(users.name, `%${q}%`),
          like(users.phone, `%${q}%`),
          like(users.email, `%${q}%`),
          like(users.clerkId, `%${q}%`)
        )!
      );
    }
    if (role && role !== "all") conditions.push(eq(users.role, role as never));
    if (status === "locked") conditions.push(eq(users.isActive, false));
    if (status === "active") conditions.push(eq(users.isActive, true));

    const rows = await db
      .select({
        user: users,
        orderCount: sql<number>`COUNT(${orders.id})`,
        totalSpent: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} NOT IN ('cancelled','pending_payment') THEN ${orders.total}::numeric ELSE 0 END), 0)`,
        lastOrderAt: sql<string | null>`MAX(${orders.createdAt})::text`,
      })
      .from(users)
      .leftJoin(orders, eq(orders.userId, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .groupBy(users.id)
      .orderBy(desc(users.createdAt));

    return ok(
      rows.map((r) => ({
        ...r.user,
        orderCount: Number(r.orderCount),
        totalSpent: Number(r.totalSpent),
        lastOrderAt: r.lastOrderAt,
      }))
    );
  } catch (err) {
    return serverError(err);
  }
}

/** Lock/unlock: bans the Clerk account (blocks sign-in) + flips the DB flag. */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireRole("owner", "admin");
    if (!user) return unauthorized();

    const body = await req.json().catch(() => null);
    const parsed = lockSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid request", 400, parsed.error.flatten());

    const [target] = await db.select().from(users).where(eq(users.id, parsed.data.userId)).limit(1);
    if (!target) return fail("User not found", 404);
    if (target.role === "owner" && parsed.data.isActive === false) {
      return fail("You cannot lock out an owner account", 403);
    }

    // Hard lockout on the auth side: ban the Clerk user + revoke sessions.
    if (target.clerkId && process.env.CLERK_SECRET_KEY) {
      try {
        const headers = { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` };
        await fetch(`https://api.clerk.com/v1/users/${target.clerkId}`, {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ banned: !parsed.data.isActive }),
          cache: "no-store",
        });
        const sessions = await fetch(
          `https://api.clerk.com/v1/sessions?user_id=${target.clerkId}`,
          { headers, cache: "no-store" }
        ).then((r) => r.json().catch(() => []));
        for (const s of Array.isArray(sessions) ? sessions : []) {
          if (s.status === "active") {
            await fetch(`https://api.clerk.com/v1/sessions/${s.id}/revoke`, {
              method: "POST",
              headers,
              cache: "no-store",
            });
          }
        }
      } catch {
        // Clerk may be unreachable — DB flag still applies.
      }
    }

    const [updated] = await db
      .update(users)
      .set({ isActive: parsed.data.isActive, updatedAt: new Date() })
      .where(eq(users.id, parsed.data.userId))
      .returning();

    return ok({ ...updated, locked: !updated.isActive });
  } catch (err) {
    return serverError(err);
  }
}

/**
 * Delete a user account: hard-deletes when the user has no orders, otherwise
 * anonymises (keeps order history intact for accounting). Owner accounts
 * cannot be deleted.
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireRole("owner");
    if (!user) return unauthorized("Owner role required");

    const body = await req.json().catch(() => null);
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid request", 400, parsed.error.flatten());

    const [target] = await db.select().from(users).where(eq(users.id, parsed.data.userId)).limit(1);
    if (!target) return fail("User not found", 404);
    if (target.role === "owner") return fail("Owner accounts cannot be deleted", 403);

    const [stats] = await db
      .select({ count: sql<number>`COUNT(${orders.id})` })
      .from(orders)
      .where(eq(orders.userId, target.id));

    // Ban + revoke sessions so they lose access immediately.
    if (target.clerkId && process.env.CLERK_SECRET_KEY) {
      try {
        const headers = { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` };
        await fetch(`https://api.clerk.com/v1/users/${target.clerkId}`, {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ banned: true }),
          cache: "no-store",
        });
      } catch {
        // best-effort
      }
    }

    const hasOrders = Number(stats?.count ?? 0) > 0;
    if (hasOrders) {
      // Keep history: detach the account and anonymise.
      const [updated] = await db
        .update(users)
        .set({
          clerkId: null,
          name: "[deleted]",
          phone: null,
          email: null,
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, target.id))
        .returning();
      return ok({ deleted: true, anonymised: true, id: updated.id });
    }

    await db.delete(users).where(eq(users.id, target.id));
    return ok({ deleted: true, anonymised: false, id: target.id });
  } catch (err) {
    return serverError(err);
  }
}