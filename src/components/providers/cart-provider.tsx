"use client";

import * as React from "react";
import type { CartLine, MenuItem, MenuOption } from "@/types";

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  tip: number;
  setTip: (tip: number) => void;
  totalWithTip: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  addItem: (item: MenuItem, quantity?: number, options?: MenuOption[]) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  removeLine: (menuItemId: string) => void;
  clear: () => void;
}

const CartContext = React.createContext<CartContextValue | null>(null);

const STORAGE_KEY = "amorino:cart:v1";
const TIP_STORAGE_KEY = "amorino:tip:v1";

export const TIP_OPTIONS = [0, 50, 100, 200];

function loadCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = React.useState<CartLine[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [tip, setTipState] = React.useState(0);
  const hydrated = React.useRef(false);

  React.useEffect(() => {
    if (!hydrated.current) {
      setLines(loadCart());
      try {
        const savedTip = Number(window.localStorage.getItem(TIP_STORAGE_KEY) ?? 0);
        setTipState(Number.isFinite(savedTip) ? savedTip : 0);
      } catch {
        // ignore
      }
      hydrated.current = true;
    }
  }, []);

  React.useEffect(() => {
    if (hydrated.current) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
      } catch {
        // storage may be unavailable (private mode); cart simply won't persist
      }
    }
  }, [lines]);

  React.useEffect(() => {
    if (hydrated.current) {
      try {
        window.localStorage.setItem(TIP_STORAGE_KEY, String(tip));
      } catch {
        // ignore
      }
    }
  }, [tip]);

  const setTip = React.useCallback((next: number) => {
    setTipState(Number.isFinite(next) && next >= 0 ? Math.round(next) : 0);
  }, []);

  const addItem = React.useCallback(
    (item: MenuItem, quantity = 1, options: MenuOption[] = []) => {
      const optionTotal = options.reduce((s, o) => s + o.price, 0);
      const unitPrice = Number(item.price) + optionTotal;
      setLines((prev) => {
        const existingIndex = prev.findIndex((l) => l.menuItemId === item.id && JSON.stringify(l.options) === JSON.stringify(options));
        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = { ...next[existingIndex], quantity: next[existingIndex].quantity + quantity };
          return next;
        }
        return [
          ...prev,
          {
            menuItemId: item.id,
            name: item.name,
            price: unitPrice,
            quantity,
            options,
            imageUrl: item.imageUrl,
          },
        ];
      });
    },
    []
  );

  const updateQuantity = React.useCallback((menuItemId: string, quantity: number) => {
    setLines((prev) => {
      if (quantity <= 0) {
        return prev.filter((l) => l.menuItemId !== menuItemId);
      }
      return prev.map((l) => (l.menuItemId === menuItemId ? { ...l, quantity } : l));
    });
  }, []);

  const removeLine = React.useCallback((menuItemId: string) => {
    setLines((prev) => prev.filter((l) => l.menuItemId !== menuItemId));
  }, []);

  const clear = React.useCallback(() => setLines([]), []);

  const value = React.useMemo(() => {
    const count = lines.reduce((s, l) => s + l.quantity, 0);
    const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
    return {
      lines,
      count,
      subtotal,
      tip,
      setTip,
      totalWithTip: subtotal + tip,
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      addItem,
      updateQuantity,
      removeLine,
      clear,
    };
  }, [lines, tip, setTip, isOpen, addItem, updateQuantity, removeLine, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}