"use client";

import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/components/providers/cart-provider";
import { Button } from "@/components/ui/button";
import { formatKES } from "@/lib/utils";

export function CartPageClient() {
  const { lines, count, subtotal, updateQuantity, removeLine } = useCart();

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-20 text-center">
        <ShoppingBag className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Button asChild>
          <Link href="/menu">Browse the Menu</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_300px]">
      <div>
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {lines.map((line) => (
              <motion.li
                key={line.menuItemId}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 40 }}
                className="flex items-center gap-4 rounded-xl border p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{line.name}</p>
                  {line.options.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {line.options.map((o) => `${o.name} (+${formatKES(o.price)})`).join(", ")}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-primary">{formatKES(line.price)} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted"
                    onClick={() => updateQuantity(line.menuItemId, line.quantity - 1)}
                    aria-label="Decrease"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center font-semibold">{line.quantity}</span>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted"
                    onClick={() => updateQuantity(line.menuItemId, line.quantity + 1)}
                    aria-label="Increase"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="ml-2 flex h-8 w-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                    onClick={() => removeLine(line.menuItemId)}
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="w-24 text-right font-bold">{formatKES(line.price * line.quantity)}</div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>

      <div className="h-fit rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Order Summary</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Items ({count})</span>
            <span>{formatKES(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery</span>
            <span>Calculated at checkout</span>
          </div>
          <div className="my-2 border-t" />
          <div className="flex justify-between text-base font-bold">
            <span>Subtotal</span>
            <span>{formatKES(subtotal)}</span>
          </div>
        </div>
        <Button asChild className="mt-5 w-full gap-2" size="lg">
          <Link href="/checkout">
            Checkout <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}