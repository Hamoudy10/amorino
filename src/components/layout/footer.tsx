"use client";

import Link from "next/link";
import Image from "next/image";
import { Phone, MessageCircle, Clock, MapPin, Camera, Heart } from "lucide-react";
import { whatsappDeepLink } from "@/lib/utils";

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="mb-2 flex items-center gap-2.5">
            <Image src="/logo.png" alt="Amorino Café" width={30} height={28} className="h-8 w-auto" />
            <p className="font-display text-base font-bold">Amorino Café</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Home of Coastal Dishes. Famous Mandi &amp; BBQ spot in the heart of Mombasa.
          </p>
          <div className="mt-3 flex gap-3">
            <a
              href="https://www.instagram.com/amorino_cafe/?hl=en"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="flex h-9 w-9 items-center justify-center rounded-full border text-muted-foreground hover:text-primary"
            >
              <Camera className="h-4 w-4" />
            </a>
            <a
              href="https://www.tiktok.com/@amorinocafe"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="flex h-9 w-9 items-center justify-center rounded-full border text-muted-foreground hover:text-primary"
            >
              <span className="text-xs font-bold">TT</span>
            </a>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">Quick Links</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li><Link href="/menu" className="hover:text-primary">Full Menu</Link></li>
            <li><Link href="/track" className="hover:text-primary">Track Your Order</Link></li>
            <li><Link href="/complain" className="hover:text-primary">Report a Problem</Link></li>
            <li><Link href="/contact" className="hover:text-primary">Contact Us</Link></li>
          </ul>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">Hours &amp; Location</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Clock className="h-4 w-4" /> 7 AM – 11 PM Daily</li>
            <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4" /> Makadara Rd, Mombasa</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> 0706 090909 / 0754 090909</li>
          </ul>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">Order Now</p>
          <p className="mb-3 text-sm text-muted-foreground">
            Order online and pay via M-Pesa for fast pickup or delivery.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/menu"
              className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Order Online
            </Link>
            <a
              href={whatsappDeepLink("Hello Amorino Café! I would like to place an order.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold transition-colors hover:bg-accent"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </div>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Amorino Café · Makadara Rd, Mombasa · Made with{" "}
        <Heart className="inline h-3 w-3 fill-primary text-primary" /> for the Coast
      </div>
    </footer>
  );
}