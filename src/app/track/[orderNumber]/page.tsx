import type { Metadata } from "next";
import { OrderTracker } from "@/components/tracking/order-tracker";

export const metadata: Metadata = { title: "Track Order" };

export default async function TrackOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ phone?: string }>;
}) {
  const { orderNumber } = await params;
  const { phone } = await searchParams;
  const cleanPhone = (phone ?? "").trim();
  const cleanOrder = orderNumber.toUpperCase();

  return (
    <div className="px-4 py-10">
      {!cleanPhone ? (
        <div className="mx-auto max-w-md rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Add your phone number to view tracking:{" "}
          <span className="font-mono">/track/{cleanOrder}?phone=0712345678</span>
        </div>
      ) : (
        <OrderTracker key={`${cleanOrder}:${cleanPhone}`} orderNumber={cleanOrder} phone={cleanPhone} />
      )}
    </div>
  );
}