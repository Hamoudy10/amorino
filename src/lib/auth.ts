import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export type UserRole = "customer" | "owner" | "admin" | "rider";

export interface SessionUser {
  id: string | null;
  clerkId: string | null;
  role: UserRole;
  phone: string | null;
}

/**
 * Resolves the current session. `auth()` from Clerk works on both server
 * components and route handlers.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session || !session.userId) return null;

  // Role comes from Clerk publicMetadata (set via webhook/dashboard).
  const metadata = (session.sessionClaims?.publicMetadata ?? {}) as Record<string, unknown>;
  const role: UserRole = (metadata.role as UserRole) ?? "customer";
  const phone: string | null =
    (metadata.phone as string) ?? session.sessionClaims?.phone_number ?? null;

  return {
    id: session.userId,
    clerkId: session.userId,
    role,
    phone,
  };
}

export async function requireRole(...roles: UserRole[]): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user) return null;
  if (roles.length > 0 && !roles.includes(user.role)) return null;
  return user;
}

/**
 * Ensures the Clerk user exists in our `users` table (upsert by clerkId).
 * Used by the Clerk webhook and on-demand by authenticated routes.
 */
export async function upsertUserFromClerk(input: {
  clerkId: string;
  phone?: string | null;
  name?: string | null;
  email?: string | null;
  role?: UserRole;
}): Promise<void> {
  if (!input.phone && !input.email) return;
  const existing = await db.select().from(users).where(eq(users.clerkId, input.clerkId)).limit(1);
  if (existing.length > 0) {
    const updates: Partial<typeof existing[0]> = {};
    if (input.phone) updates.phone = input.phone;
    if (input.name) updates.name = input.name;
    if (input.email) updates.email = input.email;
    if (input.role) updates.role = input.role;
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      await db.update(users).set(updates).where(eq(users.clerkId, input.clerkId));
    }
    return;
  }
  const phone = input.phone;
  if (!phone) return;
  // Avoid unique constraint conflict if the phone already exists with another clerkId
  const byPhone = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (byPhone.length > 0) {
    await db
      .update(users)
      .set({ clerkId: input.clerkId, updatedAt: new Date() })
      .where(eq(users.id, byPhone[0].id));
    return;
  }
  await db.insert(users).values({
    clerkId: input.clerkId,
    phone,
    name: input.name ?? null,
    email: input.email ?? null,
    role: input.role ?? "customer",
  });
}

export async function setUserRole(clerkId: string, role: UserRole): Promise<void> {
  const client = await clerkClient();
  await client.users.updateUser(clerkId, { publicMetadata: { role } });
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.clerkId, clerkId));
}

/**
 * Resolves the application `users.id` (UUID) for a Clerk session. Used where
 * DB foreign keys (e.g. orders.rider_id) must match the current user.
 */
export async function getDbUserId(clerkId: string): Promise<string | null> {
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.clerkId, clerkId)).limit(1);
  return row?.id ?? null;
}

export interface DbSessionUser extends SessionUser {
  dbUserId: string | null;
}

export async function getSessionUserWithDbId(): Promise<DbSessionUser | null> {
  const user = await getSessionUser();
  if (!user?.clerkId) return null;
  const dbUserId = await getDbUserId(user.clerkId);
  return { ...user, dbUserId };
}
