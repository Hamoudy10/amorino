import { db } from "@/db";
import { categories, menuItems } from "@/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import type { MenuCategoryWithItems } from "@/types";

export async function getPublicMenu(): Promise<MenuCategoryWithItems[]> {
  const cats = await db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  const items = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.isAvailable, true));

  const byCategory = new Map<string, typeof items>();
  for (const item of items) {
    if (!item.categoryId) continue;
    const list = byCategory.get(item.categoryId) ?? [];
    list.push(item);
    byCategory.set(item.categoryId, list);
  }

  return cats
    .filter((c) => (byCategory.get(c.id)?.length ?? 0) > 0)
    .map((c) => ({
      ...c,
      items: (byCategory.get(c.id) ?? []).map((item) => ({ ...item, options: item.options ?? [] })),
    }));
}

export async function getPopularItems(limit = 6): Promise<MenuCategoryWithItems["items"]> {
  const items = await db
    .select()
    .from(menuItems)
    .where(sql`${menuItems.isPopular} = true AND ${menuItems.isAvailable} = true`)
    .orderBy(asc(menuItems.name))
    .limit(limit);
  return items.map((item) => ({ ...item, options: item.options ?? [] }));
}

export async function getMenuItemBySlug(slug: string) {
  const [item] = await db.select().from(menuItems).where(eq(menuItems.slug, slug)).limit(1);
  return item ?? null;
}

export async function getCategoryBySlug(slug: string) {
  const [cat] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return cat ?? null;
}

export async function getMenuItemById(id: string) {
  const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id)).limit(1);
  return item ?? null;
}
