import { NextRequest } from "next/server";
import { getCustomerSegments } from "@/lib/analytics";
import { ok, serverError, unauthorized } from "@/lib/api";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Customer segmentation — counts + member lists + CSV-friendly payload. */
export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("owner", "admin");
    if (!user) return unauthorized();

    const segments = await getCustomerSegments();
    return ok({ segments });
  } catch (err) {
    return serverError(err);
  }
}