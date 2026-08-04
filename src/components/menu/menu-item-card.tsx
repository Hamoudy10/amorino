"use client";

import { motion } from "framer-motion";
import { Flame, Leaf, Clock, Plus } from "lucide-react";
import { useCart } from "@/components/providers/cart-provider";
import { Badge } from "@/components/ui/badge";
import { formatKES } from "@/lib/utils";
import type { MenuItem } from "@/types";

export function MenuItemCard({ item, index = 0 }: { item: MenuItem; index?: number }) {
  const { addItem, open } = useCart();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.4) }}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full bg-muted">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-100 to-teal-100">
            <span className="text-4xl">🍽️</span>
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {item.isPopular && <Badge variant="default">Popular</Badge>}
          {item.isVegetarian && (
            <Badge variant="success" className="gap-1"><Leaf className="h-3 w-3" /> Veg</Badge>
          )}
          {item.isSpicy && (
            <Badge variant="destructive" className="gap-1"><Flame className="h-3 w-3" /> Spicy</Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug">{item.name}</h3>
          <span className="shrink-0 font-bold text-primary">{formatKES(item.price)}</span>
        </div>
        {item.description && (
          <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> ~{item.prepTimeMinutes ?? 15} min
          </span>
          <button
            type="button"
            onClick={() => {
              addItem(item, 1, []);
              open();
            }}
            className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>
    </motion.div>
  );
}