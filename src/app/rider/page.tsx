import type { Metadata } from "next";
import { RiderApp } from "@/components/rider/rider-app";

export const metadata: Metadata = { title: "Rider Portal" };

export default function RiderPage() {
  return <RiderApp />;
}