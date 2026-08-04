import type { Metadata } from "next";
import { Suspense } from "react";
import { ComplaintForm } from "@/components/complaints/complaint-form";

export const metadata: Metadata = { title: "Report a Problem" };

export default function ComplainPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="mb-8 text-center text-3xl font-bold tracking-tight">Report a Problem</h1>
      <Suspense fallback={null}>
        <ComplaintForm />
      </Suspense>
    </div>
  );
}