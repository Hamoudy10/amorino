"use client";

import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const BUSINESS_PHONE = "254706090909";

export function whatsappLink(text: string): string {
  return `https://wa.me/${BUSINESS_PHONE}?text=${encodeURIComponent(text)}`;
}

export function WhatsAppButton({ className }: { className?: string }) {
  return (
    <a
      href={whatsappLink("Hello Amorino Café! I would like to place an order.")}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        className
      )}
    >
      <MessageCircle className="h-4 w-4 text-[#25D366]" />
      Chat with us
    </a>
  );
}