"use client";

import * as React from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/providers/cart-provider";
import { formatKES } from "@/lib/utils";
import type { MenuItem } from "@/types";

interface Recommended {
  name: string;
  reason?: string;
}

interface RecommendResponse {
  items: Recommended[];
  source: string;
}

/**
 * "Tell us what you're craving" — DeepSeek-powered suggestions that map
 * back to real menu items with add-to-cart.
 */
export function CravingInput({ menu }: { menu: MenuItem[] }) {
  const { addItem, open } = useCart();
  const [text, setText] = React.useState("");
  const [results, setResults] = React.useState<Recommended[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const menuById = React.useMemo(() => new Map(menu.map((m) => [m.name, m])), [menu]);

  const recommend = async () => {
    if (text.trim().length < 3) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: text.trim() }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Could not get suggestions");
        setResults(null);
        return;
      }
      setResults(json.data.items);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">Tell us what you&apos;re craving</p>
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void recommend();
          }}
          placeholder="e.g. something spicy with chicken under KES 1000…"
          aria-label="Describe what you're craving"
        />
        <Button onClick={() => void recommend()} disabled={loading || text.trim().length < 3} className="shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          <span className="hidden sm:inline">Suggest</span>
        </Button>
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      {results && results.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {results.map((r) => {
            const item = menuById.get(r.name);
            if (!item) return null;
            return (
              <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  {r.reason && <p className="truncate text-xs text-muted-foreground">{r.reason}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-bold text-primary">{formatKES(item.price)}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      addItem(item, 1, []);
                      open();
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setResults(null)}
            className="flex items-center gap-1 pt-1 text-xs text-muted-foreground hover:underline"
          >
            <X className="h-3 w-3" /> Clear suggestions
          </button>
        </div>
      )}
    </div>
  );
}