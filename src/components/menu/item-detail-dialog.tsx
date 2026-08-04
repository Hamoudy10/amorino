"use client";

import * as React from "react";
import { Minus, Plus, Leaf, Flame, Clock, ShoppingBag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/providers/cart-provider";
import { formatKES } from "@/lib/utils";
import type { MenuItem, MenuOption } from "@/types";

export function ItemDetailDialog({ item, onClose }: { item: MenuItem | null; onClose: () => void }) {
  const { addItem, open } = useCart();
  const [quantity, setQuantity] = React.useState(1);
  const [selectedOptions, setSelectedOptions] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (item) {
      setQuantity(1);
      setSelectedOptions({});
    }
  }, [item]);

  if (!item) return null;

  const chosenOptions: MenuOption[] = (item.options ?? []).filter((o) => selectedOptions[o.name]);

  const optionTotal = chosenOptions.reduce((s, o) => s + o.price, 0);
  const unitPrice = Number(item.price) + optionTotal;

  const handleAdd = () => {
    addItem(item, quantity, chosenOptions);
    onClose();
    open();
  };

  return (
    <Dialog open={Boolean(item)} onOpenChange={(openState) => (openState ? undefined : onClose())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-1.5 pt-1">
            {item.isPopular && <Badge>Popular</Badge>}
            {item.isVegetarian && <Badge variant="success" className="gap-1"><Leaf className="h-3 w-3" />Veg</Badge>}
            {item.isSpicy && <Badge variant="destructive" className="gap-1"><Flame className="h-3 w-3" />Spicy</Badge>}
          </DialogDescription>
        </DialogHeader>

        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.name} className="aspect-[16/9] w-full rounded-lg object-cover" />
        ) : null}

        {item.description && (
          <p className="text-sm text-muted-foreground">{item.description}</p>
        )}

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> Ready in ~{item.prepTimeMinutes ?? 15} minutes
        </p>

        {(item.options ?? []).length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold">Add-ons</p>
            <div className="space-y-2">
              {(item.options ?? []).map((opt) => (
                <label
                  key={opt.name}
                  className="flex cursor-pointer items-center justify-between rounded-lg border p-3 text-sm hover:bg-accent"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedOptions[opt.name])}
                      onChange={(e) =>
                        setSelectedOptions((prev) => ({ ...prev, [opt.name]: e.target.checked }))
                      }
                      className="h-4 w-4 accent-primary"
                    />
                    {opt.name}
                  </span>
                  {opt.price > 0 && <span className="font-medium text-primary">+{formatKES(opt.price)}</span>}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-md border hover:bg-muted"
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center font-semibold">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(50, q + 1))}
              className="flex h-9 w-9 items-center justify-center rounded-md border hover:bg-muted"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <Button onClick={handleAdd} className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            Add · {formatKES(unitPrice * quantity)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}