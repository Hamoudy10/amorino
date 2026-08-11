"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { normalizePhone } from "@/lib/utils";

export function TrackLookup() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [error, setError] = React.useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = orderNumber.trim().toUpperCase();
    if (!/^AMR-\d{6}$/.test(num)) {
      setError("Enter a valid order number, e.g. AMR-000123");
      return;
    }
    if (!/^(\+?254|0)?[0-9]{9}$/.test(phone.trim())) {
      setError("Enter the phone number used when ordering (e.g. 0712345678)");
      return;
    }
    setError("");
    router.push(`/track/${num}?phone=${encodeURIComponent(phone.trim())}`);
  };

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Track your order</CardTitle>
        <CardDescription>
          Enter your order number and the phone number you used to order.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="orderNumber">Order number</Label>
            <Input
              id="orderNumber"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="AMR-000123"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712345678"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full gap-2">
            <Search className="h-4 w-4" /> Track Order
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
