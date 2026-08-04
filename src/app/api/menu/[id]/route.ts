import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { menuItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id)).limit(1);
  if (!item) {
    return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: item });
}