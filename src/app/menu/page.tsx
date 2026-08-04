import type { Metadata } from "next";
import { getPublicMenu } from "@/lib/menu-data";
import { MenuExplorer } from "@/components/menu/menu-explorer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Full Menu",
  description: "Browse the full Amorino Café menu — Mandi, BBQ, seafood, shawarma, coffee, shakes and more.",
};

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  let menu: Awaited<ReturnType<typeof getPublicMenu>> = [];
  try {
    menu = await getPublicMenu();
  } catch (err) {
    console.error("[menu] fetch failed", err);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Our Menu</h1>
        <p className="text-sm text-muted-foreground">
          Every dish made to order. Delivery &amp; pickup available · M-Pesa accepted.
        </p>
      </div>
      <MenuExplorer menu={menu} initialCategory={category} />
    </div>
  );
}