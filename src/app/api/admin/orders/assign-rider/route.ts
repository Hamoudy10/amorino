import { NextRequest } from "next/server";
import { riderAssignmentSchema } from "@/lib/validators";
import { ok, fail, serverError, unauthorized } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { assignRider } from "@/lib/orders";

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("owner", "admin");
    if (!user) return unauthorized();

    const body = await req.json().catch(() => null);
    const parsed = riderAssignmentSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid assignment data", 400, parsed.error.flatten());

    const order = await assignRider({
      orderId: parsed.data.orderId,
      riderId: parsed.data.riderId,
      actorUserId: user.id,
    });
    return ok(order);
  } catch (err) {
    return serverError(err);
  }
}