"use client";

import * as React from "react";
import { RefreshCw, CheckCircle2, Loader2, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { formatKES, formatDateTime } from "@/lib/utils";

interface PaymentRow {
  id: string;
  orderId: string | null;
  orderNumber: string | null;
  status: string;
  resultCode: string | null;
  resultDesc: string | null;
  mpesaReceiptNumber: string | null;
  phoneNumber: string | null;
  amount: string;
  createdAt: string;
  orderStatus: string | null;
  orderPaymentStatus: string | null;
}

const STATUS_VARIANT: Record<string, "success" | "destructive" | "secondary" | "default" | "outline"> = {
  success: "success",
  failed: "destructive",
  initiated: "secondary",
  cancelled: "outline",
};

export function PaymentsAdmin() {
  const [payments, setPayments] = React.useState<PaymentRow[] | null>(null);
  const [totals, setTotals] = React.useState<Record<string, number>>({});
  const [filter, setFilter] = React.useState("all");
  const [marking, setMarking] = React.useState<string | null>(null);

  const fetchPayments = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/payments?status=${filter}`, { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setPayments(json.data.payments);
        setTotals(json.data.totalsByMethod);
      }
    } catch {
      // ignored
    }
  }, [filter]);

  React.useEffect(() => {
    void fetchPayments();
  }, [fetchPayments]);

  const markPaid = async (orderId: string) => {
    setMarking(orderId);
    try {
      const res = await fetch("/api/admin/payments/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? "Could not mark paid");
        return;
      }
      toast.success(json.data.alreadyPaid ? "Order already paid" : "Order marked as paid");
      await fetchPayments();
    } catch {
      toast.error("Network error");
    } finally {
      setMarking(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground">Reconciliation view — all payment rows, receipts and manual override.</p>
        </div>
        <div className="flex items-center gap-1">
          {["all", "success", "initiated", "failed", "cancelled"].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={filter === s ? "default" : "outline"}
              onClick={() => setFilter(s)}
            >
              {s}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => void fetchPayments()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {Object.entries(totals).map(([method, total]) => (
          <Card key={method}>
            <CardContent className="pt-5">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
                <Wallet className="h-3.5 w-3.5" /> {method} — paid total
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums">{formatKES(total)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {payments === null ? (
        <Skeleton className="h-64 w-full" />
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No payment rows for this filter.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-4 py-2.5 font-medium">{p.orderNumber ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={STATUS_VARIANT[p.status] ?? "outline"}>{p.status}</Badge>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{formatKES(p.amount)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{p.mpesaReceiptNumber ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs">{p.phoneNumber ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDateTime(p.createdAt)}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.resultDesc ?? p.resultCode ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      {p.orderId && p.orderPaymentStatus !== "paid" && p.status !== "success" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          disabled={marking === p.orderId}
                          onClick={() => void markPaid(p.orderId!)}
                        >
                          {marking === p.orderId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Mark paid
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}