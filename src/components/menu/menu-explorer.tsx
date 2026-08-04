"use client";

import * as React from "react";
import Image from "next/image";
import { Search, Plus, Minus, ShoppingBag, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { MenuCategoryWithItems, MenuItem } from "@/types";
import { useCart } from "@/components/providers/cart-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ItemDetailDialog } from "@/components/menu/item-detail-dialog";
import { formatKES } from "@/lib/utils";

type Filter = "all" | "popular" | "veg" | "spicy";

export function MenuExplorer({
  menu,
  initialCategory,
}: {
  menu: MenuCategoryWithItems[];
  initialCategory?: string;
}) {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");
  const [selected, setSelected] = React.useState<MenuItem | null>(null);
  const [activeCategory, setActiveCategory] = React.useState<string>(
    initialCategory && menu.some((c) => c.slug === initialCategory)
      ? initialCategory
      : (menu[0]?.slug ?? "")
  );

  // Scroll-spy: highlight the category currently in view.
  React.useEffect(() => {
    const sections = menu.map((c) => document.getElementById(`cat-${c.slug}`)).filter(Boolean) as HTMLElement[];
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.id.replace("cat-", ""));
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [menu, filter, query]);

  const filtered = menu
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => {
        if (filter === "popular" && !item.isPopular) return false;
        if (filter === "veg" && !item.isVegetarian) return false;
        if (filter === "spicy" && !item.isSpicy) return false;
        if (query.trim() && !item.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
        return true;
      }),
    }))
    .filter((cat) => cat.items.length > 0);

  const scrollToCategory = (slug: string) => {
    setActiveCategory(slug);
    document.getElementById(`cat-${slug}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div>
      {/* Top bar: search + filters */}
      <div className="sticky top-16 z-30 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dishes…"
              className="pl-9"
              aria-label="Search menu"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-thin">
            {(
              [
                { key: "all", label: "All" },
                { key: "popular", label: "Popular" },
                { key: "veg", label: "Vegetarian" },
                { key: "spicy", label: "Spicy" },
              ] as { key: Filter; label: string }[]
            ).map((f) => (
              <Button
                key={f.key}
                type="button"
                size="sm"
                variant={filter === f.key ? "default" : "outline"}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Mobile: horizontal category chips */}
        <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-thin md:hidden">
          {menu.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => scrollToCategory(cat.slug)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === cat.slug
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        {/* Desktop: category sidebar */}
        <aside className="hidden md:block">
          <nav className="sticky top-40 max-h-[calc(100vh-11rem)] space-y-1 overflow-y-auto pr-1 scrollbar-thin">
            {menu.map((cat) => {
              const active = activeCategory === cat.slug;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => scrollToCategory(cat.slug)}
                  className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border bg-muted">
                    {cat.imageUrl && (
                      <Image src={cat.imageUrl} alt="" fill sizes="40px" className="object-cover" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className={`block truncate text-sm font-medium ${active ? "text-primary" : ""}`}>
                      {cat.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">{cat.items.length} items</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Items grouped by category */}
        <div className="min-w-0 space-y-8 pt-6 md:pt-0">
          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <p className="text-sm text-muted-foreground">No items match your search.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
          {filtered.map((cat) => (
            <section key={cat.slug} id={`cat-${cat.slug}`} className="scroll-mt-44 md:scroll-mt-40">
              <div className="mb-3 flex items-end justify-between gap-3 border-b pb-2">
                <h2 className="font-display text-xl font-bold">{cat.name}</h2>
                <span className="shrink-0 text-xs text-muted-foreground">{cat.items.length} items</span>
              </div>
              <div className="divide-y rounded-xl border bg-card">
                {cat.items.map((item) => (
                  <MenuItemRow key={item.id} item={item} onSelect={() => setSelected(item)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <ItemDetailDialog item={selected} onClose={() => setSelected(null)} />

      {menu.length === 0 && (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          Menu coming soon. Call 0706 090909 to order.
        </div>
      )}
    </div>
  );
}

function MenuItemRow({ item, onSelect }: { item: MenuItem; onSelect: () => void }) {
  const { lines, addItem, updateQuantity } = useCart();
  const qty = lines.find((l) => l.menuItemId === item.id)?.quantity ?? 0;
  const hasOptions = (item.options?.length ?? 0) > 0;

  const handleAdd = () => {
    if (hasOptions) {
      onSelect(); // let them pick options first
    } else {
      addItem(item, 1, []);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3">
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        aria-label={`View ${item.name}`}
      >
        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
          {item.imageUrl ? (
            <Image src={item.imageUrl} alt={item.name} fill sizes="64px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              No pic
            </span>
          )}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-medium">{item.name}</span>
            {hasOptions && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          </span>
          {item.description && (
            <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{item.description}</span>
          )}
          <span className="mt-1 block text-sm font-bold text-primary">{formatKES(item.price)}</span>
        </span>
      </button>

      {/* Quantity stepper */}
      <div className="shrink-0">
        {qty === 0 ? (
          <button
            type="button"
            onClick={handleAdd}
            aria-label={`Add ${item.name}`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center gap-2 rounded-full border bg-background p-1">
            <button
              type="button"
              onClick={() => updateQuantity(item.id, qty - 1)}
              aria-label="Decrease quantity"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-muted transition-colors hover:bg-accent"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-5 text-center text-sm font-bold">{qty}</span>
            <button
              type="button"
              onClick={handleAdd}
              aria-label="Increase quantity"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}