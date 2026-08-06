import { NextRequest } from "next/server";
import { db } from "@/db";
import { orders, orderItems, menuItems } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { ok, fail, serverError } from "@/lib/api";
import { rateLimit } from "@/lib/redis";
import { getClientIp } from "@/lib/request";
import { chatCompletion, extractJson } from "@/lib/deepseek";
import { z } from "zod";

export const dynamic = "force-dynamic";

const recommendSchema = z.object({
  preferences: z.string().min(3).max(500).optional(),
  budget: z.coerce.number().min(1).max(100000).optional(),
  phone: z.string().min(10).optional(),
});

const aiItemsSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string(),
        reason: z.string().optional(),
      })
    )
    .max(5),
});

/**
 * AI recommendations: DeepSeek-powered suggestions grounded in the live
 * menu. Falls back to an empty list on any failure (never blocks ordering).
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const allowed = await rateLimit(`rl:ai:${ip}`, 20, 3600);
    if (!allowed) return fail("Too many requests. Please try again later.", 429);

    const body = await req.json().catch(() => null);
    const parsed = recommendSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid request", 400, parsed.error.flatten());

    // 1) If we have order history for this phone, use data-driven
    //    co-occurrence recommendations first (cheap, instant, no API).
    if (parsed.data.phone) {
      const history = await db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.customerPhone, parsed.data.phone))
        .orderBy(desc(orders.createdAt))
        .limit(10);
      if (history.length > 0) {
        const orderIds = history.map((o) => o.id);
        const rows = await db
          .select({ name: orderItems.name, count: orderItems.name })
          .from(orderItems)
          .where(inArray(orderItems.orderId, orderIds));
        const counts = new Map<string, number>();
        for (const r of rows) {
          counts.set(r.name, (counts.get(r.name) ?? 0) + 1);
        }
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
        if (top.length > 0) {
          return ok({ items: top.map(([name, count]) => ({ name, reason: `Ordered ${count}× before` })), source: "history" });
        }
      }
    }

    // 2) DeepSeek path — ground the model with the live menu.
    const menu = await db
      .select({
        name: menuItems.name,
        price: menuItems.price,
        description: menuItems.description,
        categoryId: menuItems.categoryId,
        isVegetarian: menuItems.isVegetarian,
        isSpicy: menuItems.isSpicy,
      })
      .from(menuItems)
      .where(eq(menuItems.isAvailable, true));

    const menuJson = JSON.stringify(menu.slice(0, 400));
    const system =
      "You are the Amorino Café menu assistant. Recommend dishes strictly from the provided menu. " +
      "Respond ONLY with JSON: {\"items\":[{\"name\":\"exact menu name\",\"reason\":\"short reason\"}]}.";
    const user = `Menu:\n${menuJson}\n\nCustomer request: "${parsed.data.preferences ?? "something tasty"}".` +
      (parsed.data.budget ? `\nBudget: KES ${parsed.data.budget} total.` : "") +
      `\nReturn up to 5 items.`;

    const raw = await chatCompletion({ system, user, json: true, temperature: 0.4 });
    const parsedJson = extractJson(raw);
    if (!parsedJson) return ok({ items: [], source: "ai-unavailable" });

    const validated = aiItemsSchema.safeParse(parsedJson);
    if (!validated.success) return ok({ items: [], source: "ai-unavailable" });

    // Only return items that actually exist in the menu (anti-hallucination).
    const menuNames = new Set(menu.map((m) => m.name));
    const items = validated.data.items
      .filter((i) => menuNames.has(i.name))
      .map((i) => ({ name: i.name, reason: i.reason }));

    return ok({ items, source: "ai" });
  } catch (err) {
    return serverError(err);
  }
}