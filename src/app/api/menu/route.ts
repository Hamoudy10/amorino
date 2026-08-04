import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categories, menuItems } from "@/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { cacheGet, cacheSet } from "@/lib/redis";

export async function GET(_req: NextRequest) {
  const cached = await cacheGet("menu:public:v1");
  if (cached) {
    return NextResponse.json({ ok: true, data: cached });
  }

  const cats = await db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  const items = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.isAvailable, true));

  const itemsByCategory = new Map<string, typeof items>();
  for (const item of items) {
    if (!item.categoryId) continue;
    const list = itemsByCategory.get(item.categoryId) ?? [];
    list.push(item);
    itemsByCategory.set(item.categoryId, list);
  }

  const data = cats
    .filter((c) => itemsByCategory.has(c.id) || items.length === 0)
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      items: itemsByCategory.get(c.id) ?? [],
    }));

  await cacheSet("menu:public:v1", data, 300);
  return NextResponse.json({ ok: true, data });
}