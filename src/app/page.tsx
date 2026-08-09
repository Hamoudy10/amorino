import Link from "next/link";
import Image from "next/image";
import {
  Beef,
  Fish,
  Coffee,
  Flame,
  Smartphone,
  ReceiptText,
  Truck,
  Star,
  ArrowRight,
  Clock,
} from "lucide-react";
import { getPopularItems, getPublicMenu } from "@/lib/menu-data";
import { getHomeReviews } from "@/lib/analytics";
import { Hero } from "@/components/home/hero";
import { MenuItemCard } from "@/components/menu/menu-item-card";
import { Button } from "@/components/ui/button";
import { formatKES } from "@/lib/utils";

export const dynamic = "force-dynamic";

const EXPERIENCE = [
  { icon: Flame, title: "Charcoal Grills", text: "T-bones, chops and whole chooza grilled over open flame." },
  { icon: Fish, title: "Ocean Fresh Seafood", text: "Lobster, king prawns and the famous Amorino seafood platter." },
  { icon: Coffee, title: "Coffee & Shake Bar", text: "Single-origin espresso, frappes and a full shake factory." },
];

const STEPS = [
  { icon: Smartphone, title: "Pick your dishes", text: "Browse 170+ dishes and add favourites to your cart in seconds." },
  { icon: ReceiptText, title: "Pay with M-Pesa", text: "Check out and approve the STK push. No card needed." },
  { icon: Truck, title: "Track it live", text: "Follow your order from the kitchen to your door, rider included." },
];

export default async function HomePage() {
  let popular: Awaited<ReturnType<typeof getPopularItems>> = [];
  let categories: Awaited<ReturnType<typeof getPublicMenu>> = [];
  let reviews: Awaited<ReturnType<typeof getHomeReviews>> = [];
  try {
    [popular, categories, reviews] = await Promise.all([
      getPopularItems(6),
      getPublicMenu(),
      getHomeReviews(6),
    ]);
  } catch (err) {
    console.error("[home] data fetch failed", err);
  }

  const showcase = categories.slice(0, 8);

  return (
    <div className="min-h-full">
      <Hero />

      {/* Signature dishes */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Signature</p>
            <h2 className="mt-1 font-display text-3xl font-bold tracking-tight">
              Most Loved Dishes
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The plates Mombasa keeps coming back for.
            </p>
          </div>
          <Button asChild variant="ghost" className="text-primary">
            <Link href="/menu">Full menu <ArrowRight className="h-4 w-4" /></Link>
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

      {/* Category showcase */}
      {showcase.length > 0 && (
        <section className="border-y bg-card">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <div className="mb-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">The Menu</p>
              <h2 className="mt-1 font-display text-3xl font-bold tracking-tight">
                One Menu, Every Craving
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                From breakfast to late-night cake — explore by category.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {showcase.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/menu?category=${cat.slug}`}
                  className="group relative overflow-hidden rounded-xl border shadow-sm"
                >
                  <div className="relative aspect-[16/10] w-full">
                    {cat.imageUrl ? (
                      <Image
                        src={cat.imageUrl}
                        alt={cat.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-amber-100 to-teal-100" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <h3 className="font-display text-lg font-bold text-white">{cat.name}</h3>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-amber-300">
                        {cat.items.length} dishes
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* The experience */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-6 md:grid-cols-3">
          {EXPERIENCE.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border bg-card p-6 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <f.icon className="h-7 w-7 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y bg-card">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="mb-8 text-center font-display text-3xl font-bold tracking-tight">
            Ordering in 3 Steps
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.title} className="rounded-xl border bg-background p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
                  <step.icon className="h-6 w-6 text-secondary" strokeWidth={1.5} />
                </div>
                <h3 className="mb-1 font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="mb-6 text-center font-display text-3xl font-bold tracking-tight">
          Loved on the Coast
        </h2>
        {reviews.length === 0 ? (
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
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="mb-2 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                  ))}
                </div>
                {r.comment && <p className="text-sm text-muted-foreground">&ldquo;{r.comment}&rdquo;</p>}
                {r.reply && (
                  <div className="mt-3 rounded-lg bg-primary/5 p-3">
                    <p className="text-xs font-semibold text-primary">Amorino Café replied</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">&ldquo;{r.reply}&rdquo;</p>
                  </div>
                )}
                <p className="mt-3 text-xs font-semibold">
                  {r.reviewerName ?? "Verified customer"}
                  {r.orderNumber && <span className="ml-1 font-normal text-muted-foreground">· {r.orderNumber}</span>}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="relative overflow-hidden rounded-2xl bg-[#14120e] p-8 text-center md:p-12">
          <div className="pointer-events-none absolute inset-0 opacity-20">
            <Image src="/food/hero.jpg" alt="" fill sizes="100vw" className="object-cover" />
          </div>
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Hungry yet?</p>
            <h2 className="mx-auto mt-2 max-w-xl font-display text-3xl font-bold text-white md:text-4xl">
              Order in under a minute. Your coast favourites, delivered hot.
            </h2>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/menu">Order Now <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <Link href="/contact">
                  <Clock className="h-4 w-4" /> 7 AM – 11 PM · Makadara Rd
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}