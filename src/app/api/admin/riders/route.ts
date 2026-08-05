import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, orders, riderLocations } from "@/db/schema";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { ok, serverError, unauthorized, fail } from "@/lib/api";
import { requireRole, upsertUserFromClerk, setUserRole } from "@/lib/auth";
import { findClerkUser, getRiderCandidates } from "@/lib/clerk-admin";
import { z } from "zod";

// Either a clerkId (copied from Clerk) or the sign-up email/phone (resolved
// server-side — no need to leave the app).
const createRiderSchema = z
  .object({
    clerkId: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(10).optional(),
    name: z.string().min(2).optional(),
  })
  .refine((v) => v.clerkId || v.email || v.phone, {
    message: "Provide the rider's email or Clerk user ID",
  });

export async function GET() {
  try {
    const user = await requireRole("owner", "admin");
    if (!user) return unauthorized();

    const riders = await db
      .select({
        id: users.id,
        name: users.name,
        phone: users.phone,
        email: users.email,
        clerkId: users.clerkId,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.role, "rider"))
      .orderBy(asc(users.createdAt));

    // Attach active delivery counts
    const stats = await db
      .select({ riderId: orders.riderId, count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.status, "out_for_delivery"))
      .groupBy(orders.riderId);

    const countByRider = new Map(stats.map((s) => [s.riderId, s.count]));

    // Latest location per rider (for a "last seen" line on each rider card)
    const locs = await db
      .select()
      .from(riderLocations)
      .orderBy(desc(riderLocations.recordedAt))
      .limit(1000);
    const latestLocByRider = new Map<string, (typeof locs)[number]>();
    for (const loc of locs) {
      if (!loc.riderId) continue;
      if (!latestLocByRider.has(loc.riderId)) latestLocByRider.set(loc.riderId, loc);
    }

    return ok({
      riders: riders.map((r) => ({
        ...r,
        activeDeliveries: countByRider.get(r.id) ?? 0,
        lastLocation: latestLocByRider.get(r.id) ?? null,
      })),
      candidates: await getRiderCandidates(),
    });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("owner", "admin");
    if (!user) return unauthorized();

    const body = await req.json().catch(() => null);
    const parsed = createRiderSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid rider data", 400, parsed.error.flatten());

    let clerkId = parsed.data.clerkId;
    let riderName = parsed.data.name ?? null;
    let riderPhone = parsed.data.phone ?? null;

    if (!clerkId) {
      // Resolve the Clerk account by email/phone so the owner never has to
      // open the Clerk dashboard.
      const found = await findClerkUser({ email: parsed.data.email, phone: parsed.data.phone });
      if (!found) {
        return fail(
          "No account found for that email — the rider must sign up on the site first",
          404
        );
      }
      clerkId = found.id;
      riderName = riderName ?? found.name;
      riderPhone = riderPhone ?? found.phone;
    }

    await upsertUserFromClerk({
      clerkId,
      phone: riderPhone,
      name: riderName,
      email: parsed.data.email,
      role: "rider",
    });
    await setUserRole(clerkId, "rider");

    return ok({ created: true }, 201);
  } catch (err) {
    return serverError(err);
  }
}