"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Flame, MessageCircle, PhoneCall, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/components/ui/whatsapp-button";

const HERO_TILES = ["🍛 Mandi Platter", "🍗 BBQ Grill", "🍤 Coastal Seafood", "☕ Fresh Coffee"];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-amber-100 via-cream to-teal-100">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Flame className="h-3.5 w-3.5" /> Home of Coastal Dishes · Mombasa
          </p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Famous <span className="text-primary">Mandi</span> &amp;{" "}
            <span className="text-secondary">BBQ</span>, delivered to your door
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            Shawarma · Coffee · Shakes · Seafood. Order online in under a minute, pay with M-Pesa,
            and track your rider live.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/menu">Order Now</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a
                href={whatsappLink("Hello Amorino Café! I would like to place an order.")}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4 text-[#25D366]" /> WhatsApp Us
              </a>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> 7 AM – 11 PM</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Makadara Rd, Mombasa</span>
            <span className="flex items-center gap-1.5"><PhoneCall className="h-4 w-4" /> 0706 090909</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative hidden md:block"
        >
          <div className="grid grid-cols-2 gap-4">
            {HERO_TILES.map((label) => (
              <div
                key={label}
                className="flex aspect-square flex-col items-center justify-center gap-3 rounded-2xl border bg-white/70 shadow-lg backdrop-blur"
              >
                <span className="text-6xl">{label.split(" ")[0]}</span>
                <span className="text-sm font-semibold">{label.split(" ").slice(1).join(" ")}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}