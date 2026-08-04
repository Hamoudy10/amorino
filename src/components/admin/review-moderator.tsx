"use client";

import * as React from "react";
import { ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { formatDateTime } from "@/lib/utils";

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  isVisible: boolean;
  createdAt: string;
  reviewerName: string;
  orderNumber: string;
}

export function ReviewModerator() {
  const [reviews, setReviews] = React.useState<ReviewRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchReviews = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/reviews", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setReviews(json.data);
    } catch {
      // ignored
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchReviews();
  }, [fetchReviews]);

  const toggleVisible = async (id: string, visible: boolean) => {
    const prev = reviews;
    setReviews((r) => r.map((x) => (x.id === id ? { ...x, isVisible: visible } : x)));
    try {
      const res = await fetch(`/api/admin/reviews`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: id, isVisible: visible }),
      });
      const json = await res.json();
      if (!json.ok) {
        setReviews(prev);
        toast.error(json.error ?? "Update failed");
        return;
      }
      toast.success(visible ? "Review visible" : "Review hidden");
    } catch {
      setReviews(prev);
      toast.error("Network error");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
        <p className="text-sm text-muted-foreground">Moderate customer reviews shown on the homepage.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-semibold">No reviews yet</p>
            <p className="text-sm text-muted-foreground">Reviews appear here once customers rate their orders.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id} className={review.isVisible ? "" : "opacity-80"}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{review.reviewerName}</p>
                    <Badge variant="outline">{review.orderNumber}</Badge>
                    <Badge variant={review.isVisible ? "success" : "secondary"}>
                      {review.isVisible ? "Visible" : "Hidden"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-amber-600">
                    {"★".repeat(review.rating)}
                    <span className="text-muted-foreground">{"☆".repeat(5 - review.rating)}</span>
                  </p>
                  {review.comment && <p className="mt-1 text-sm">{review.comment}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(review.createdAt)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant={review.isVisible ? "outline" : "default"}
                    onClick={() => void toggleVisible(review.id, true)}
                  >
                    <ThumbsUp className="h-4 w-4" /> Show
                  </Button>
                  <Button
                    size="sm"
                    variant={review.isVisible ? "secondary" : "outline"}
                    onClick={() => void toggleVisible(review.id, false)}
                  >
                    <ThumbsDown className="h-4 w-4" /> Hide
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}