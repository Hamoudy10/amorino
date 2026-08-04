import type { Metadata } from "next";
import { TrackLookup } from "@/components/tracking/track-lookup";

export const metadata: Metadata = { title: "Track Your Order" };

export default function TrackPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="mb-8 text-center text-3xl font-bold tracking-tight">Track Your Order</h1>
      <TrackLookup />
    </div>
  );
}