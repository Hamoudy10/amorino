import type { Metadata } from "next";
import { Clock, MapPin, Phone, Mail, MessageCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Contact Us" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-2 text-center text-3xl font-bold tracking-tight">Visit Us</h1>
      <p className="mb-10 text-center text-muted-foreground">
        We&apos;re on Makadara Rd in the heart of Mombasa, open every day.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">Address</p>
                <p className="text-sm text-muted-foreground">Makadara Rd, Mombasa, Kenya</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">Opening Hours</p>
                <p className="text-sm text-muted-foreground">Every day · 7:00 AM – 11:00 PM</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">Phone</p>
                <p className="text-sm text-muted-foreground">0706 090909 · 0754 090909</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">Email</p>
                <p className="text-sm text-muted-foreground">hello@amorinocafe.co.ke</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <p className="text-sm text-muted-foreground">
              The fastest way to reach us is WhatsApp. We reply quickly during opening hours.
            </p>
            <WhatsAppButton />
            <Button asChild variant="outline">
              <a href="https://www.instagram.com/amorino_cafe/?hl=en" target="_blank" rel="noopener noreferrer">
                <Camera className="h-4 w-4" /> Follow on Instagram
              </a>
            </Button>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="h-4 w-4 text-[#25D366]" />@amorinocafe
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <iframe
          title="Amorino Café location (Makadara Rd, Mombasa)"
          src="https://www.google.com/maps?q=Makadara+Rd,+Mombasa,+Kenya&output=embed"
          className="h-72 w-full rounded-xl border"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}