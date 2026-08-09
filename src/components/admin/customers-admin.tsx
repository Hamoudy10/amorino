"use client";

import * as React from "react";
import { Users, Download, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatKES, formatDateTime } from "@/lib/utils";

interface SegmentCustomer {
  phone: string;
  name: string | null;
  email: string | null;
  orders: number;
  revenue: number;
  lastOrderAt: string | null;
}

interface Segment {
  segment: string;
  label: string;
  count: number;
  customers: SegmentCustomer[];
}

const SEGMENT_STYLE: Record<string, { variant: "default" | "success" | "secondary" | "destructive" | "outline"; color: string }> = {
  champions: { variant: "default", color: "border-primary bg-primary/10 text-primary" },
  loyal: { variant: "success", color: "border-success/30 bg-success/10 text-success" },
  at_risk: { variant: "secondary", color: "" },
  lost: { variant: "destructive", color: "" },
  new: { variant: "outline", color: "" },
  one_time: { variant: "outline", color: "" },
};

export function CustomersAdmin() {
  const [segments, setSegments] = React.useState<Segment[] | null>(null);
  const [active, setActive] = React.useState<string>("champions");

  const fetchSegments = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/customers", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setSegments(json.data.segments);
    } catch {
      // ignored
    }
  }, []);

  React.useEffect(() => {
    void fetchSegments();
  }, [fetchSegments]);

  const downloadCsv = () => {
    if (!segments) return;
    const rows = [["Segment", "Phone", "Name", "Email", "Orders", "Revenue", "Last order"]];
    for (const seg of segments) {
      for (const c of seg.customers) {
        rows.push([seg.label, c.phone, c.name ?? "", c.email ?? "", String(c.orders), c.revenue.toFixed(2), c.lastOrderAt ?? ""]);
      }
    }
    const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "amorino-customers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!segments) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const total = segments.reduce((s, x) => s + x.count, 0);
  const activeSeg = segments.find((s) => s.segment === active);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">{total} tracked customers across all segments</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => void fetchSegments()}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={downloadCsv} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {segments.map((seg) => {
          const style = SEGMENT_STYLE[seg.segment];
          return (
            <button
              key={seg.segment}
              type="button"
              onClick={() => setActive(seg.segment)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                active === seg.segment
                  ? style.color || "border-primary bg-primary/5"
                  : "bg-card hover:bg-accent/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{seg.label.split("—")[0].trim()}</p>
                <Badge variant={style.variant}>{seg.count}</Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{seg.label}</p>
            </button>
          );
        })}
      </div>

      {activeSeg && (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <Users className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">{activeSeg.label}</p>
            </div>
            {activeSeg.customers.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No customers in this segment yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2.5">Customer</th>
                      <th className="px-4 py-2.5">Phone</th>
                      <th className="px-4 py-2.5">Orders</th>
                      <th className="px-4 py-2.5">Revenue</th>
                      <th className="px-4 py-2.5">Last order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSeg.customers.map((c) => (
                      <tr key={c.phone} className="border-b last:border-0">
                        <td className="px-4 py-2 font-medium">{c.name ?? c.email ?? "—"}</td>
                        <td className="px-4 py-2 tabular-nums">{c.phone}</td>
                        <td className="px-4 py-2">{c.orders}</td>
                        <td className="px-4 py-2 tabular-nums">{formatKES(c.revenue)}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">
                          {c.lastOrderAt ? formatDateTime(c.lastOrderAt) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}