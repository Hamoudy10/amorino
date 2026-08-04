"use client";

import * as React from "react";
import { Plus, Loader2, Bike } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { formatDateTime } from "@/lib/utils";

interface RiderRow {
  id: string;
  name: string | null;
  phone: string;
  clerkId: string | null;
  isActive: boolean | null;
  createdAt: string;
  activeDeliveries: number;
}

export function RiderManager() {
  const [riders, setRiders] = React.useState<RiderRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState({ clerkId: "", phone: "", name: "" });
  const [saving, setSaving] = React.useState(false);

  const fetchRiders = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/riders", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setRiders(json.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchRiders();
  }, [fetchRiders]);

  const addRider = async () => {
    if (!form.clerkId.trim() || !form.phone.trim()) {
      toast.error("Clerk user ID and phone are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/riders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: form.clerkId.trim(),
          phone: form.phone.trim(),
          name: form.name.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? "Could not add rider");
        return;
      }
      toast.success("Rider added");
      setDialogOpen(false);
      setForm({ clerkId: "", phone: "", name: "" });
      await fetchRiders();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Riders</h1>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Rider
        </Button>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Loading riders…</p>
      ) : riders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Bike className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-semibold">No riders yet</p>
            <p className="text-sm text-muted-foreground">
              Add a rider to assign deliveries. The rider must first sign up on{" "}
              <span className="font-mono">/rider</span> so you have their Clerk user ID.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {riders.map((rider) => (
            <Card key={rider.id}>
              <CardContent className="pt-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-semibold">{rider.name ?? rider.phone}</p>
                  <Badge variant={rider.isActive ? "success" : "outline"}>
                    {rider.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{rider.phone}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {rider.activeDeliveries} active delivery{ rider.activeDeliveries === 1 ? "" : "ies"} · added {formatDateTime(rider.createdAt)}
                </p>
                <p className="mt-2 break-all rounded bg-muted p-2 font-mono text-[11px] text-muted-foreground">
                  clerkId: {rider.clerkId ?? "—"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a Rider</DialogTitle>
            <DialogDescription>
              Copy the rider&apos;s Clerk user ID from their profile, then link it to their phone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rider-clerkid">Clerk user ID *</Label>
              <Input
                id="rider-clerkid"
                value={form.clerkId}
                onChange={(e) => setForm({ ...form, clerkId: e.target.value })}
                placeholder="user_2abc…"
              />
            </div>
            <div>
              <Label htmlFor="rider-phone">Phone *</Label>
              <Input
                id="rider-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0712345678"
              />
            </div>
            <div>
              <Label htmlFor="rider-name">Name</Label>
              <Input
                id="rider-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Brian Otieno"
              />
            </div>
            <Button className="w-full" onClick={() => void addRider()} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Rider
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}