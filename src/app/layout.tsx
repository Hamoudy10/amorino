import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/providers/cart-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Amorino Café — Mandi, BBQ, Shawarma, Coffee & Shakes | Mombasa",
    template: "%s | Amorino Café",
  },
  description:
    "Amorino Café, Makadara Rd Mombasa. Order Mandi, BBQ, seafood, shawarma, coffee and shakes online — pay with M-Pesa and track your delivery live.",
  keywords: ["Amorino Café", "Mombasa", "Mandi", "BBQ", "shawarma", "coffee", "seafood", "delivery"],
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "Amorino Café — Order Online",
    description: "Home of Coastal Dishes. Famous Mandi & BBQ spot in Mombasa. Order online with M-Pesa.",
    siteName: "Amorino Café",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <CartProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <CartDrawer />
          <Toaster richColors position="top-center" />
        </CartProvider>
      </body>
    </html>
  );
}