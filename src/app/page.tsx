import Link from "next/link";
import { motion } from "framer-motion";
import { Flame, MessageCircle, PhoneCall, Smartphone, ReceiptText, Truck, Star, MapPin, Clock } from "lucide-react";
import { getPopularItems } from "@/lib/menu-data";
import { MenuItemCard } from "@/components/menu/menu-item-card";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/components/ui/whatsapp-button";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let popular: Awaited<ReturnType<typeof getPopularItems>> = [];
  try {
    popular = await getPopularItems(6);
  } catch (err) {
    console.error("[home] menu fetch failed", err);
  }

  return (
    <div className="min-h-full">
      {/* Hero */}
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
                <a href={whatsappLink("Hello Amorino Café! I would like to place an order.")} target="_blank" rel="noopener noreferrer">
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
              {["🍛 Mandi Platter", "🍗 BBQ Grill", "🍤 Coastal Seafood", "☕ Fresh Coffee"].map((label, i) => (
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

      {/* Popular items */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Our Most Loved Dishes</h2>
            <p className="text-sm text-muted-foreground">Straight from our kitchen to you.</p>
          </div>
          <Button asChild variant="ghost">
            <Link href="/menu" className="text-primary">View full menu →</Link>
          </Button>
        </div>

        {popular.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            Menu coming soon. Check back shortly — or call 0706 090909 to order now.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popular.map((item, i) => (
              <MenuItemCard key={item.id} item={item} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="border-y bg-card">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">How Ordering Works</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Smartphone, title: "1. Pick your dishes", text: "Browse the menu and add your favourites to the cart in seconds." },
              { icon: ReceiptText, title: "2. Pay with M-Pesa", text: "Check out and approve the STK push on your phone. No card needed." },
              { icon: Truck, title: "3. Track live", text: "Follow your order from the kitchen to your door with live rider tracking." },
            ].map((step) => (
              <div key={step.title} className="rounded-xl border bg-background p-6 text-center">
                <step.icon className="mx-auto mb-3 h-8 w-8 text-primary" />
                <h3 className="mb-1 font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews / social proof */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="mb-6 text-center text-2xl font-bold tracking-tight">Loved on the Coast</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { stars: 5, text: "Best mandi in Mombasa — the chicken just falls off the bone. Delivery was fast and hot!", name: "Ahmed K." },
            { stars: 5, text: "Their BBQ wings are addictive. Ordering is so easy with M-Pesa and I could track the rider live.", name: "Wanjiru M." },
            { stars: 5, text: "Amazing shawarma and shakes. The staff are friendly and the coffee is real good.", name: "Fahad O." },
          ].map((r) => (
            <div key={r.name} className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="mb-2 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < r.stars ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">&ldquo;{r.text}&rdquo;</p>
              <p className="mt-3 text-xs font-semibold">{r.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Socials CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-primary/10 p-8 text-center md:flex-row md:text-left">
          <div>
            <h2 className="text-xl font-bold">Join the Amorino family</h2>
            <p className="text-sm text-muted-foreground">
              Follow us for daily specials, discounts and behind-the-scenes content.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild variant="secondary">
              <a href="https://www.instagram.com/amorino_cafe/?hl=en" target="_blank" rel="noopener noreferrer">Instagram</a>
            </Button>
            <Button asChild variant="outline">
              <a href="https://www.tiktok.com/@amorinocafe" target="_blank" rel="noopener noreferrer">TikTok</a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}