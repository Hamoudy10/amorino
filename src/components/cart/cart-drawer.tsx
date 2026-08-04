"use client";

import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/components/providers/cart-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatKES } from "@/lib/utils";

export function CartDrawer() {
  const { lines, count, subtotal, isOpen, close, updateQuantity, removeLine } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (open ? undefined : close())}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Your Cart {count > 0 && `(${count})`}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Your cart is empty.</p>
              <Button asChild variant="secondary">
                <Link href="/menu" onClick={close}>Browse the Menu</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-4">
              <AnimatePresence initial={false}>
                {lines.map((line) => (
                  <motion.li
                    key={line.menuItemId}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{line.name}</p>
                      {line.options.length > 0 && (
                        <p className="truncate text-xs text-muted-foreground">
                          {line.options.map((o) => o.name).join(", ")}
                        </p>
                      )}
                      <p className="mt-1 text-sm font-medium text-primary">{formatKES(line.price * line.quantity)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded border hover:bg-muted"
                        onClick={() => updateQuantity(line.menuItemId, line.quantity - 1)}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center text-sm font-semibold">{line.quantity}</span>
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded border hover:bg-muted"
                        onClick={() => updateQuantity(line.menuItemId, line.quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="ml-1 flex h-7 w-7 items-center justify-center rounded text-destructive hover:bg-destructive/10"
                        onClick={() => removeLine(line.menuItemId)}
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        {lines.length > 0 && (
          <div className="border-t px-6 py-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-lg font-bold">{formatKES(subtotal)}</span>
            </div>
            <Button asChild className="w-full" size="lg" onClick={close}>
              <Link href="/checkout">Proceed to Checkout</Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}