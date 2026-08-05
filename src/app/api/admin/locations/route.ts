import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, orders, riderLocations } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { ok, serverError, unauthorized } from "@/lib/api";
import { requireRole } from "@/lib/auth";

/**
 * Fleet view: every rider's latest location (last 15 min) plus the order
 * they're currently delivering.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("owner", "admin");
    if (!user) return unauthorized();

    const [locs, riders, active] = await Promise.all([
      // Latest location per rider — no time cutoff, so the admin always sees
      // the last known position (staleness is shown by the UI).
      db
        .select()
        .from(riderLocations)
        .orderBy(desc(riderLocations.recordedAt))
        .limit(1000),
      db
        .select({ id: users.id, name: users.name, phone: users.phone })
        .from(users)
        .where(eq(users.role, "rider")),
      db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          riderId: orders.riderId,
          status: orders.status,
          deliveryAddress: orders.deliveryAddress,
          customerName: orders.customerName,
          customerPhone: orders.customerPhone,
        })
        .from(orders)
        .where(inArray(orders.status, ["confirmed", "preparing", "ready", "out_for_delivery"])),
    ]);

    const latestByRider = new Map<string, (typeof locs)[number]>();
    for (const loc of locs) {
      if (!loc.riderId) continue;
      if (!latestByRider.has(loc.riderId)) latestByRider.set(loc.riderId, loc);
    }

    return ok({
      riders: riders.map((r) => ({
        ...r,
        location: latestByRider.get(r.id) ?? null,
        activeOrder: active.find((o) => o.riderId === r.id) ?? null,
      })),
      café: { lat: -4.0435, lng: 39.6682 },
    });
  } catch (err) {
    return serverError(err);
  }
}