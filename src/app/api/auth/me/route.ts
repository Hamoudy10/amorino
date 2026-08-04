import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/api";

export async function GET(_req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  return ok({
    id: user.id,
    role: user.role,
    phone: user.phone,
    clerkId: user.clerkId,
  });
}