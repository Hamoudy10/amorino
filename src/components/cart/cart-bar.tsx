"use client";

import { ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "@/components/providers/cart-provider";
import { formatKES } from "@/lib/utils";

export function CartBar() {
  const { count, subtotal, open } = useCart();

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed inset-x-0 bottom-4 z-40 px-4"
        >
          <button
            type="button"
            onClick={open}
            className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 rounded-full bg-[#14120e] px-5 py-3.5 text-white shadow-xl transition-transform active:scale-[0.99]"
          >
            <span className="flex items-center gap-2.5">
              <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                <ShoppingBag className="h-4 w-4" />
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold">
                  {count}
                </span>
              </span>
              <span className="text-sm font-medium">View basket</span>
            </span>
            <span className="text-sm font-bold">{formatKES(subtotal)}</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}