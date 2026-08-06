import { NextRequest } from "next/server";
import { db } from "@/db";
import { categories, menuItems } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { menuItemAdminSchema, categoryAdminSchema } from "@/lib/validators";
import { ok, fail, serverError, unauthorized } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { cacheDelete } from "@/lib/redis";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET() {
  try {
    const cats = await db.select().from(categories).orderBy(asc(categories.sortOrder));
    const items = await db.select().from(menuItems);
    return ok({ categories: cats, items });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("owner", "admin");
    if (!user) return unauthorized();

    const body = await req.json().catch(() => null);
    if (body?.kind === "category") {
      const parsed = categoryAdminSchema.safeParse(body);
      if (!parsed.success) return fail("Invalid category data", 400, parsed.error.flatten());
      const [created] = await db
        .insert(categories)
        .values({
          name: parsed.data.name,
          slug: slugify(parsed.data.name),
          description: parsed.data.description ?? null,
          sortOrder: parsed.data.sortOrder,
          imageUrl: parsed.data.imageUrl || null,
          isActive: parsed.data.isActive,
        })
        .returning();
      return ok(created, 201);
    }

    const parsed = menuItemAdminSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid menu item data", 400, parsed.error.flatten());
    const [created] = await db
      .insert(menuItems)
      .values({
        categoryId: parsed.data.categoryId,
        name: parsed.data.name,
        slug: slugify(parsed.data.name),
        description: parsed.data.description ?? null,
        price: parsed.data.price.toFixed(2),
        imageUrl: parsed.data.imageUrl || null,
        isAvailable: parsed.data.isAvailable,
        isPopular: parsed.data.isPopular,
        isVegetarian: parsed.data.isVegetarian,
        isSpicy: parsed.data.isSpicy,
        prepTimeMinutes: parsed.data.prepTimeMinutes,
        options: parsed.data.options,
      })
      .returning();
    await cacheDelete("menu:public");
    return ok(created, 201);
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireRole("owner", "admin");
    if (!user) return unauthorized();

    const body = await req.json().catch(() => null);
    if (body?.kind === "category") {
      const parsed = categoryAdminSchema.safeParse(body);
      if (!parsed.success || !parsed.data.id) {
        return fail("Invalid category data", 400, parsed.error?.flatten());
      }
      const [updated] = await db
        .update(categories)
        .set({
          name: parsed.data.name,
          slug: slugify(parsed.data.name),
          description: parsed.data.description ?? null,
          sortOrder: parsed.data.sortOrder,
          imageUrl: parsed.data.imageUrl || null,
          isActive: parsed.data.isActive,
        })
        .where(eq(categories.id, parsed.data.id))
        .returning();
      return ok(updated);
    }

    const parsed = menuItemAdminSchema.safeParse(body);
    if (!parsed.success || !parsed.data.id) {
      return fail("Invalid menu item data", 400, parsed.error?.flatten());
    }
    const [updated] = await db
      .update(menuItems)
      .set({
        categoryId: parsed.data.categoryId,
        name: parsed.data.name,
        slug: slugify(parsed.data.name),
        description: parsed.data.description ?? null,
        price: parsed.data.price.toFixed(2),
        imageUrl: parsed.data.imageUrl || null,
        isAvailable: parsed.data.isAvailable,
        isPopular: parsed.data.isPopular,
        isVegetarian: parsed.data.isVegetarian,
        isSpicy: parsed.data.isSpicy,
        prepTimeMinutes: parsed.data.prepTimeMinutes,
        options: parsed.data.options,
        updatedAt: new Date(),
      })
      .where(eq(menuItems.id, parsed.data.id))
      .returning();
    await cacheDelete("menu:public");
    return ok(updated);
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireRole("owner", "admin");
    if (!user) return unauthorized();

    const id = req.nextUrl.searchParams.get("id");
    const kind = req.nextUrl.searchParams.get("kind") ?? "item";
    if (!id) return fail("Missing id", 400);

    if (kind === "category") {
      await db.delete(categories).where(eq(categories.id, id));
    } else {
      await db.delete(menuItems).where(eq(menuItems.id, id));
    }
    await cacheDelete("menu:public");
    return ok({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
}
