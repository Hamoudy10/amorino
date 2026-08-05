import type { Metadata } from "next";
import { MyOrders } from "@/components/account/my-orders";

export const metadata: Metadata = {
  title: "My Orders",
  description: "Your Amorino Café orders — track, review and reorder.",
};

export default function AccountPage() {
  return <MyOrders />;
}