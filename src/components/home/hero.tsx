"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Flame, MessageCircle, Clock, MapPin, Star, ChevronRight, Coffee, Beef, Fish, IceCreamCone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/components/ui/whatsapp-button";

const SIGNATURES = [
  { icon: Beef, label: "Charcoal Grills" },
  { icon: Fish, label: "Ocean Seafood" },
  { icon: Coffee, label: "Specialty Coffee" },
  { icon: IceCreamCone, label: "Shake Factory" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background photo */}
      <div className="absolute inset-0">
        <Image
          src="/food/hero.jpg"
          alt="Amorino Café dishes"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#14120e]/95 via-[#14120e]/80 to-[#14120e]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#14120e]/70 via-transparent to-[#14120e]/30" />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-[1.2fr_0.8fr] md:items-center md:py-28 lg:py-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-5 flex items-center gap-3">
            <Image src="/logo.png" alt="" width={44} height={41} className="h-11 w-auto drop-shadow" />
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold tracking-wide text-amber-300">
              EST. ON THE MOMBASA COAST
            </span>
          </div>

          <h1 className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
            Slow-grilled. <span className="text-amber-400">Coastal.</span>
            <br />
            Unmistakably <span className="italic">Amorino</span>.
          </h1>

          <p className="mt-5 max-w-lg text-base text-stone-300 md:text-lg">
            Home of the famous mandi, charcoal BBQ and seafood — plus a full coffee and shake
            bar. Order online, pay with M-Pesa, and track your rider to the door.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link href="/menu">
                Explore the Menu <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white">
              <a
                href={whatsappLink("Hello Amorino Café! I would like to place an order.")}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4 text-[#25D366]" /> WhatsApp Us
              </a>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-300">
            <span className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> Loved on the Coast
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-amber-400" /> Open 7 AM – 11 PM
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-amber-400" /> Makadara Rd, Mombasa
            </span>
          </div>
        </motion.div>

        {/* Signature chips */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="hidden md:block"
        >
          <div className="grid grid-cols-2 gap-4">
            {SIGNATURES.map((s) => (
              <div
                key={s.label}
                className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-md transition-colors hover:border-amber-400/40 hover:bg-white/15"
              >
                <s.icon className="h-9 w-9 text-amber-400" strokeWidth={1.5} />
                <span className="text-center text-sm font-semibold text-white">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-amber-400/20 bg-[#14120e]/60 px-4 py-3 backdrop-blur">
            <Flame className="h-4 w-4 text-amber-400" />
            <p className="text-sm text-stone-200">
              <span className="font-semibold text-white">170+ dishes</span> — one full menu, coast to coast
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}