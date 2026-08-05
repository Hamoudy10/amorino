import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Looks up a Clerk user by email (or phone) using the Backend API — lets the
 * admin add riders without leaving the app to copy a Clerk user ID.
 */
export async function findClerkUser(
  query: { email?: string; phone?: string }
): Promise<{ id: string; name: string | null; phone: string | null } | null> {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) return null;

  const params = new URLSearchParams();
  if (query.email) params.set("email_address", query.email);
  if (query.phone) params.set("phone_number", query.phone);
  if (params.size === 0) return null;

  const res = await fetch(`https://api.clerk.com/v1/users?${params.toString()}`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Clerk lookup failed (${res.status})`);

  const list = (await res.json()) as Array<{
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    phone_numbers?: Array<{ phone_number: string }>;
  }>;
  if (!Array.isArray(list) || list.length === 0) return null;

  const u = list[0];
  return {
    id: u.id,
    name: u.first_name || u.last_name ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() : null,
    phone: u.phone_numbers?.[0]?.phone_number ?? null,
  };
}

/**
 * Accounts that have signed up on the site (synced via the Clerk webhook)
 * but haven't been given a role yet — one-click rider promotion.
 */
export async function getRiderCandidates() {
  return db
    .select({ id: users.id, clerkId: users.clerkId, email: users.email, name: users.name, phone: users.phone })
    .from(users)
    .where(eq(users.role, "customer"))
    .orderBy(users.createdAt);
}
