"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { normalizePhone } from "@/lib/utils";
import { whatsappLink } from "@/components/ui/whatsapp-button";

const CATEGORIES = [
  { value: "missing_item", label: "Missing item" },
  { value: "wrong_item", label: "Wrong item" },
  { value: "late_delivery", label: "Late delivery" },
  { value: "quality", label: "Food quality" },
  { value: "payment", label: "Payment issue" },
  { value: "other", label: "Other" },
];

export function ComplaintForm() {
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = React.useState(
    searchParams.get("orderNumber") ?? ""
  );
  const [phone, setPhone] = React.useState("");
  const [category, setCategory] = React.useState<string>("");
  const [description, setDescription] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [ticketId, setTicketId] = React.useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      toast.error("Please choose a category");
      return;
    }
    if (description.trim().length < 5) {
      toast.error("Please describe the problem (at least 5 characters)");
      return;
    }
    if (!/^(\+?254|0)?[0-9]{9}$/.test(phone.trim())) {
      toast.error("Enter a valid phone number so we can reach you");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: orderNumber.trim().toUpperCase() || undefined,
          phone: normalizePhone(phone.trim()),
          category,
          description: description.trim(),
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? "Could not submit complaint");
        return;
      }
      setTicketId(json.data.id);
      setDone(true);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-success" />
          <h2 className="text-xl font-bold">Complaint received</h2>
          <p className="text-sm text-muted-foreground">
            Ticket #{ticketId.slice(0, 8)}. Our team will investigate and get back to you shortly
            (usually within 24 hours).
          </p>
          <a
            href={whatsappLink("Hello Amorino! Following up on my complaint.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold hover:bg-accent"
          >
            <MessageCircle className="h-4 w-4 text-[#25D366]" /> Chat with support
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Report a problem</CardTitle>
        <CardDescription>
          Missing or wrong items, late deliveries, quality issues — we take every complaint seriously.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="complaint-order">Order number (optional)</Label>
            <Input
              id="complaint-order"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
              placeholder="AMR-000123"
            />
          </div>
          <div>
            <Label htmlFor="complaint-phone">Phone number *</Label>
            <Input
              id="complaint-phone"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712345678"
            />
          </div>
          <div>
            <Label>Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="complaint-desc">Describe the problem *</Label>
            <Textarea
              id="complaint-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What went wrong? The more detail, the faster we can fix it."
              rows={4}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit Complaint
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
