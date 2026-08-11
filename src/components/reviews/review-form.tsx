"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Star, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { normalizePhone } from "@/lib/utils";

export function ReviewForm({ orderNumber: initialOrderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = React.useState(initialOrderNumber);
  const [phone, setPhone] = React.useState("");
  const [rating, setRating] = React.useState(0);
  const [hoverRating, setHoverRating] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a star rating");
      return;
    }
    if (!/^AMR-\d{6}$/.test(orderNumber.trim().toUpperCase())) {
      toast.error("Enter a valid order number, e.g. AMR-000123");
      return;
    }
    if (!/^(\+?254|0)?[0-9]{9}$/.test(phone.trim())) {
      toast.error("Enter the phone number used when ordering");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: orderNumber.trim().toUpperCase(),
          phone: normalizePhone(phone.trim()),
          rating,
          comment: comment.trim(),
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? "Could not submit review");
        return;
      }
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
          <h2 className="text-xl font-bold">Thank you for your feedback!</h2>
          <p className="text-sm text-muted-foreground">
            Your review helps us serve you better.
          </p>
          <Button onClick={() => router.push("/menu")}>Back to Menu</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Rate your order</CardTitle>
        <CardDescription>
          Tell us how your Amorino experience was. Reviews are shown on our site.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-5">
          <div>
            <Label htmlFor="orderNumber">Order number</Label>
            <Input
              id="orderNumber"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
              placeholder="AMR-000123"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone used when ordering</Label>
            <Input
              id="phone"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712345678"
            />
          </div>

          <div>
            <Label>Your rating</Label>
            <div className="mt-1 flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={`${star} star${star > 1 ? "s" : ""}`}
                  className="p-0.5"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (hoverRating || rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="comment">Your comment (optional)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you love? What could we improve?"
              rows={4}
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit Review
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
