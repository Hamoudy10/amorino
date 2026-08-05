"use client";

import * as React from "react";
import { Plus, Loader2, Bike, UserPlus } from "lucide-react";
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
  phone: string | null;
  email: string | null;
  clerkId: string | null;
  isActive: boolean | null;
  createdAt: string;
  activeDeliveries: number;
}

interface CandidateRow {
  id: string;
  clerkId: string | null;
  email: string | null;
  name: string | null;
  phone: string | null;
}

export function RiderManager() {
  const [riders, setRiders] = React.useState<RiderRow[]>([]);
  const [candidates, setCandidates] = React.useState<CandidateRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState({ email: "", phone: "", name: "" });
  const [saving, setSaving] = React.useState(false);
  const [promotingId, setPromotingId] = React.useState<string | null>(null);

  const fetchRiders = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/riders", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setRiders(json.data.riders);
        setCandidates(json.data.candidates);
      }
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
    if (!form.email.trim()) {
      toast.error("Enter the rider's sign-up email");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/riders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          name: form.name.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? "Could not add rider");
        return;
      }
      toast.success("Rider added — they can sign in now");
      setDialogOpen(false);
      setForm({ email: "", phone: "", name: "" });
      await fetchRiders();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const promote = async (c: CandidateRow) => {
    setPromotingId(c.id);
    try {
      const res = await fetch("/api/admin/riders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkId: c.clerkId!, phone: c.phone ?? undefined }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? "Could not promote user");
        return;
      }
      toast.success(`${c.name ?? c.email} is now a rider`);
      await fetchRiders();
    } catch {
      toast.error("Network error");
    } finally {
      setPromotingId(null);
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

      {/* Candidates who signed up but aren't riders yet */}
      {candidates.length > 0 && (
        <Card>
          <CardContent className="space-y-2 pt-5">
            <div className="mb-2 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">
                Signed-up accounts — one click to make them a rider
              </p>
            </div>
            {candidates.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.name ?? c.email}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.email ?? "no email"} · {c.phone ?? "no phone"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  disabled={promotingId === c.id}
                  onClick={() => void promote(c)}
                >
                  {promotingId === c.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Make rider
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Loading riders…</p>
      ) : riders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Bike className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-semibold">No riders yet</p>
            <p className="text-sm text-muted-foreground">
              The rider signs up on the site first (Sign up → their email). Then add them here
              with that email — no need to leave this app.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {riders.map((rider) => (
            <Card key={rider.id}>
              <CardContent className="pt-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-semibold">{rider.name ?? rider.phone ?? rider.email}</p>
                  <Badge variant={rider.isActive ? "success" : "outline"}>
                    {rider.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{rider.phone ?? rider.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {rider.activeDeliveries} active deliver{rider.activeDeliveries === 1 ? "y" : "ies"} · added{" "}
                  {formatDateTime(rider.createdAt)}
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
              The rider must sign up on the site first. Enter the email they used — their account
              is found automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rider-email">Sign-up email *</Label>
              <Input
                id="rider-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="rider@example.com"
              />
            </div>
            <div>
              <Label htmlFor="rider-phone">Phone (for delivery notifications)</Label>
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