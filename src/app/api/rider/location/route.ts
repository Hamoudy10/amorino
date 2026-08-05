import { NextRequest } from "next/server";
import { db } from "@/db";
import { riderLocations, orders } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { riderLocationSchema } from "@/lib/validators";
import { ok, fail, serverError } from "@/lib/api";
import { getSessionUserWithDbId } from "@/lib/auth";
import { rateLimit } from "@/lib/redis";
import { getClientIp } from "@/lib/request";
import { emitOrderEvent } from "@/lib/realtime";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUserWithDbId();
    if (!user || !user.dbUserId) return fail("Rider authentication required", 401);

    const ip = getClientIp(req);
    const allowed = await rateLimit(`rl:riderloc:${user.dbUserId}`, 30, 60);
    if (!allowed) return fail("Location update rate limit exceeded", 429);

    const body = await req.json().catch(() => null);
    const parsed = riderLocationSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid location data", 400, parsed.error.flatten());

    // Verify the rider is assigned to the order they claim to be delivering
    if (parsed.data.orderId) {
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, parsed.data.orderId))
        .limit(1);
      if (!order || order.riderId !== user.dbUserId) {
        return fail("You are not assigned to this order", 403);
      }
    }

    const [location] = await db
      .insert(riderLocations)
      .values({
        riderId: user.dbUserId,
        orderId: parsed.data.orderId ?? null,
        lat: parsed.data.lat.toFixed(6),
        lng: parsed.data.lng.toFixed(6),
        accuracy: parsed.data.accuracy?.toFixed(2) ?? null,
      })
      .returning();

    if (parsed.data.orderId) {
      await emitOrderEvent({
        orderId: parsed.data.orderId,
        orderNumber: "",
        status: "rider_location",
        updatedAt: new Date().toISOString(),
      });
    }

    return ok({ id: location.id, recordedAt: location.recordedAt }, 201);
  } catch (err) {
    return serverError(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const orderId = req.nextUrl.searchParams.get("orderId");
    if (!orderId) return fail("Missing orderId", 400);

    const rows = await db
      .select({
        lat: riderLocations.lat,
        lng: riderLocations.lng,
        accuracy: riderLocations.accuracy,
        recordedAt: riderLocations.recordedAt,
      })
      .from(riderLocations)
      .where(eq(riderLocations.orderId, orderId))
      .orderBy(desc(riderLocations.recordedAt))
      .limit(1);
    return ok(rows[0] ?? null);
  } catch (err) {
    return serverError(err);
  }
}