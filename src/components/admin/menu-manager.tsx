"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, Loader2, Leaf, Flame, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";
import { formatKES } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number | null;
  isActive: boolean | null;
}

interface AdminItem {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  isAvailable: boolean | null;
  isPopular: boolean | null;
  isVegetarian: boolean | null;
  isSpicy: boolean | null;
  prepTimeMinutes: number | null;
  options: { name: string; price: number }[] | null;
}

type ItemDraft = {
  id?: string;
  categoryId: string;
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  isAvailable: boolean;
  isPopular: boolean;
  isVegetarian: boolean;
  isSpicy: boolean;
  prepTimeMinutes: string;
  options: { name: string; price: string }[];
};

const EMPTY_DRAFT: ItemDraft = {
  categoryId: "",
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  isAvailable: true,
  isPopular: false,
  isVegetarian: false,
  isSpicy: false,
  prepTimeMinutes: "15",
  options: [],
};

export function MenuManager() {
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [items, setItems] = React.useState<AdminItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [itemDialogOpen, setItemDialogOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<ItemDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; name: string } | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/menu", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setCategories(json.data.categories);
        setItems(json.data.items);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const openNew = () => {
    setDraft({ ...EMPTY_DRAFT, categoryId: categories[0]?.id ?? "" });
    setItemDialogOpen(true);
  };

  const openEdit = (item: AdminItem) => {
    setDraft({
      id: item.id,
      categoryId: item.categoryId ?? "",
      name: item.name,
      description: item.description ?? "",
      price: item.price,
      imageUrl: item.imageUrl ?? "",
      isAvailable: item.isAvailable ?? true,
      isPopular: item.isPopular ?? false,
      isVegetarian: item.isVegetarian ?? false,
      isSpicy: item.isSpicy ?? false,
      prepTimeMinutes: String(item.prepTimeMinutes ?? 15),
      options: (item.options ?? []).map((o) => ({ name: o.name, price: String(o.price) })),
    });
    setItemDialogOpen(true);
  };

  const saveItem = async () => {
    if (!draft.name.trim()) {
      toast.error("Item name is required");
      return;
    }
    const price = Number(draft.price);
    if (!price || price <= 0) {
      toast.error("Enter a valid price");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        id: draft.id,
        categoryId: draft.categoryId || null,
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        price,
        imageUrl: draft.imageUrl.trim() || undefined,
        isAvailable: draft.isAvailable,
        isPopular: draft.isPopular,
        isVegetarian: draft.isVegetarian,
        isSpicy: draft.isSpicy,
        prepTimeMinutes: Number(draft.prepTimeMinutes) || 15,
        options: draft.options
          .filter((o) => o.name.trim())
          .map((o) => ({ name: o.name.trim(), price: Number(o.price) || 0 })),
      };
      const res = await fetch("/api/admin/menu", {
        method: draft.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? "Save failed");
        return;
      }
      toast.success(draft.id ? "Item updated" : "Item created");
      setItemDialogOpen(false);
      await fetchData();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/menu?id=${deleteTarget.id}&kind=item`, { method: "DELETE" });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? "Delete failed");
        return;
      }
      toast.success("Item deleted");
      await fetchData();
    } catch {
      toast.error("Network error");
    } finally {
      setDeleteTarget(null);
    }
  };

  const toggleAvailability = async (item: AdminItem) => {
    await fetch("/api/admin/menu", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        categoryId: item.categoryId,
        name: item.name,
        description: item.description ?? undefined,
        price: Number(item.price),
        imageUrl: item.imageUrl ?? undefined,
        isAvailable: !item.isAvailable,
        isPopular: item.isPopular ?? false,
        isVegetarian: item.isVegetarian ?? false,
        isSpicy: item.isSpicy ?? false,
        prepTimeMinutes: item.prepTimeMinutes ?? 15,
        options: item.options ?? [],
      }),
    });
    await fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Menu Management</h1>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Loading menu…</p>
      ) : (
        <div className="space-y-8">
          {categories.map((cat) => {
            const catItems = items.filter((i) => i.categoryId === cat.id);
            return (
              <section key={cat.id}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{cat.name}</h2>
                  <Badge variant="secondary">{catItems.length} items</Badge>
                </div>
                {catItems.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                    No items in this category.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {catItems.map((item) => (
                      <Card key={item.id}>
                        <CardContent className="pt-5">
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{formatKES(item.price)}</p>
                            </div>
                            <div className="flex gap-1">
                              {item.isPopular && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
                              {item.isVegetarian && <Leaf className="h-4 w-4 text-success" />}
                              {item.isSpicy && <Flame className="h-4 w-4 text-destructive" />}
                            </div>
                          </div>
                          <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
                            {item.description ?? "—"}
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Switch
                                checked={item.isAvailable ?? true}
                                onCheckedChange={() => void toggleAvailability(item)}
                              />
                              Available
                            </label>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openEdit(item)} aria-label="Edit">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => setDeleteTarget({ id: item.id, name: item.name })}
                                aria-label="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit item" : "Add item"}</DialogTitle>
            <DialogDescription>Menu changes appear on the site immediately.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="item-name">Name *</Label>
              <Input
                id="item-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Chicken Mandi"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="item-price">Price (KES) *</Label>
                <Input
                  id="item-price"
                  inputMode="decimal"
                  value={draft.price}
                  onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                  placeholder="1200"
                />
              </div>
              <div>
                <Label htmlFor="item-prep">Prep time (min)</Label>
                <Input
                  id="item-prep"
                  inputMode="numeric"
                  value={draft.prepTimeMinutes}
                  onChange={(e) => setDraft({ ...draft, prepTimeMinutes: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="item-cat">Category</Label>
              <Select
                value={draft.categoryId}
                onValueChange={(v) => setDraft({ ...draft, categoryId: v })}
              >
                <SelectTrigger id="item-cat" className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="item-desc">Description</Label>
              <Textarea
                id="item-desc"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="item-img">Image URL (Cloudinary or any image URL)</Label>
              <Input
                id="item-img"
                value={draft.imageUrl}
                onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
                placeholder="https://res.cloudinary.com/…"
              />
            </div>

            <div>
              <Label>Flags</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                {(
                  [
                    ["isAvailable", "Available"],
                    ["isPopular", "Popular"],
                    ["isVegetarian", "Vegetarian"],
                    ["isSpicy", "Spicy"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 rounded-lg border p-3">
                    <Checkbox
                      checked={draft[key]}
                      onCheckedChange={(checked) => setDraft({ ...draft, [key]: Boolean(checked) })}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Add-ons / options</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setDraft({ ...draft, options: [...draft.options, { name: "", price: "0" }] })
                  }
                >
                  <Plus className="h-3.5 w-3.5" /> Add option
                </Button>
              </div>
              <div className="space-y-2">
                {draft.options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={opt.name}
                      onChange={(e) => {
                        const next = [...draft.options];
                        next[i] = { ...next[i], name: e.target.value };
                        setDraft({ ...draft, options: next });
                      }}
                      placeholder="Option name (e.g. Extra cheese)"
                      className="flex-1"
                    />
                    <Input
                      value={opt.price}
                      inputMode="decimal"
                      onChange={(e) => {
                        const next = [...draft.options];
                        next[i] = { ...next[i], price: e.target.value };
                        setDraft({ ...draft, options: next });
                      }}
                      placeholder="+KES"
                      className="w-24"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => {
                        const next = draft.options.filter((_, idx) => idx !== i);
                        setDraft({ ...draft, options: next });
                      }}
                      aria-label="Remove option"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Button className="w-full" onClick={() => void saveItem()} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {draft.id ? "Save Changes" : "Create Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the item from the menu. Past orders are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void deleteItem()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}