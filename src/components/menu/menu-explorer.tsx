"use client";

import * as React from "react";
import { Search, Flame, Leaf } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { MenuCategoryWithItems, MenuItem } from "@/types";
import { MenuItemCard } from "@/components/menu/menu-item-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ItemDetailDialog } from "@/components/menu/item-detail-dialog";

type Filter = "all" | "popular" | "veg" | "spicy";

export function MenuExplorer({
  menu,
  initialCategory,
}: {
  menu: MenuCategoryWithItems[];
  initialCategory?: string;
}) {
  const [query, setQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<string>(
    initialCategory && menu.some((c) => c.slug === initialCategory)
      ? initialCategory
      : (menu[0]?.slug ?? "")
  );
  const [filter, setFilter] = React.useState<Filter>("all");
  const [selected, setSelected] = React.useState<MenuItem | null>(null);

  React.useEffect(() => {
    if (initialCategory && menu.some((c) => c.slug === initialCategory)) {
      setActiveCategory(initialCategory);
    }
  }, [initialCategory, menu]);

  const allItems = menu.flatMap((c) => c.items);
  const visibleItems = allItems.filter((item) => {
    if (filter === "popular" && !item.isPopular) return false;
    if (filter === "veg" && !item.isVegetarian) return false;
    if (filter === "spicy" && !item.isSpicy) return false;
    if (query.trim() && !item.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  });

  const activeCategoryData = menu.find((c) => c.slug === activeCategory);
  const categoryItems = visibleItems.filter((i) => i.categoryId === activeCategoryData?.id);

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "popular", label: "Popular" },
    { key: "veg", label: "Vegetarian" },
    { key: "spicy", label: "Spicy" },
  ];

  return (
    <div>
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
            {filters.map((f) => (
              <Button
                key={f.key}
                type="button"
                size="sm"
                variant={filter === f.key ? "default" : "outline"}
                onClick={() => setFilter(f.key)}
              >
                {f.key === "veg" && <Leaf className="h-3.5 w-3.5" />}
                {f.key === "spicy" && <Flame className="h-3.5 w-3.5" />}
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-thin">
          {menu.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => setActiveCategory(cat.slug)}
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

      <section className="py-6" aria-label="Menu items">
        {categoryItems.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <p className="text-sm text-muted-foreground">
              No items match your search in this category.
            </p>
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
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {categoryItems.map((item, i) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => setSelected(item)}
                  >
                    <MenuItemCard item={item} index={i} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      <ItemDetailDialog item={selected} onClose={() => setSelected(null)} />

      {menu.length === 0 && (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          Menu coming soon. Call 0706 090909 to order.
        </div>
      )}
    </div>
  );
}