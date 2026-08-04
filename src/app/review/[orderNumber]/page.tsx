import type { Metadata } from "next";
import { ReviewForm } from "@/components/reviews/review-form";

export const metadata: Metadata = { title: "Leave a Review" };

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="mb-8 text-center text-3xl font-bold tracking-tight">Leave a Review</h1>
      <ReviewForm orderNumber={orderNumber.toUpperCase()} />
    </div>
  );
}