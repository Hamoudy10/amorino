"use client";

import * as React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { formatDateTime } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  escalated: "Escalated",
};

const CATEGORY_LABELS: Record<string, string> = {
  missing_item: "Missing item",
  wrong_item: "Wrong item",
  late_delivery: "Late delivery",
  quality: "Quality",
  payment: "Payment",
  other: "Other",
};

interface ComplaintRow {
  id: string;
  orderId: string | null;
  orderNumber: string | null;
  phone: string;
  category: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "escalated";
  assignedTo: string | null;
  assignedName: string | null;
  resolution: string | null;
  createdAt: string;
}

interface RiderOption {
  id: string;
  name: string | null;
}

export function ComplaintManager() {
  const [complaints, setComplaints] = React.useState<ComplaintRow[]>([]);
  const [riders, setRiders] = React.useState<RiderOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("all");
  const [active, setActive] = React.useState<ComplaintRow | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [resolution, setResolution] = React.useState("");
  const [status, setStatus] = React.useState<ComplaintRow["status"]>("open");
  const [assignedTo, setAssignedTo] = React.useState<string>("");

  const fetchAll = React.useCallback(async () => {
    try {
      const [cRes, rRes] = await Promise.all([
        fetch(`/api/admin/complaints?status=${filter}`, { cache: "no-store" }),
        fetch("/api/admin/riders", { cache: "no-store" }),
      ]);
      const cJson = await cRes.json();
      const rJson = await rRes.json();
      if (cJson.ok) setComplaints(cJson.data);
      if (rJson.ok) setRiders(rJson.data.map((r: { id: string; name: string | null }) => ({ id: r.id, name: r.name })));
    } catch {
      // ignored
    } finally {
      setLoading(false);
    }
  }, [filter]);

  React.useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const openDialog = (c: ComplaintRow) => {
    setActive(c);
    setStatus(c.status);
    setResolution(c.resolution ?? "");
    setAssignedTo(c.assignedTo ?? "");
  };

  const save = async () => {
    if (!active) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/complaints", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaintId: active.id,
          status,
          assignedTo: assignedTo || null,
          resolution: resolution.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? "Save failed");
        return;
      }
      toast.success("Complaint updated");
      setActive(null);
      await fetchAll();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Complaints</h1>
          <p className="text-sm text-muted-foreground">Track and resolve customer complaints.</p>
        </div>
        <div className="flex gap-1">
          {["all", "open", "in_progress", "escalated", "resolved"].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={filter === s ? "default" : "outline"}
              onClick={() => setFilter(s)}
            >
              {s === "all" ? "All" : STATUS_LABELS[s]}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : complaints.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-semibold">No complaints here</p>
            <p className="text-sm text-muted-foreground">All clear for this filter.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={c.status === "resolved" ? "success" : c.status === "escalated" ? "destructive" : "default"}>
                      {STATUS_LABELS[c.status]}
                    </Badge>
                    <Badge variant="outline">{CATEGORY_LABELS[c.category] ?? c.category}</Badge>
                    {c.orderNumber && <Badge variant="outline">{c.orderNumber}</Badge>}
                    {c.assignedName && <Badge variant="secondary">{c.assignedName}</Badge>}
                  </div>
                  <p className="mt-2 text-sm">{c.description}</p>
                  {c.resolution && (
                    <p className="mt-1 text-xs text-muted-foreground">Resolution: {c.resolution}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.phone} · {formatDateTime(c.createdAt)}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="shrink-0" onClick={() => openDialog(c)}>
                  Manage
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={active !== null} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage complaint</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ComplaintRow["status"])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assign to (staff member)</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {riders.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name ?? r.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="resolution">Resolution notes</Label>
                <Textarea
                  id="resolution"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="What was done to resolve this?"
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setActive(null)}>
                  Cancel
                </Button>
                <Button onClick={() => void save()} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}