import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { CartProvider } from "@/components/providers/cart-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartBar } from "@/components/cart/cart-bar";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ClerkProvider>
          <CartProvider>
            <Header />
            <main className="flex-1 pb-16 md:pb-0">{children}</main>
            <Footer />
            <BottomNav />
            <CartDrawer />
            <CartBar />
            <Toaster richColors position="top-center" />
          </CartProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}