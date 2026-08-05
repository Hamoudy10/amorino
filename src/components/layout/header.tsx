"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Menu, X, LogOut, LayoutDashboard, ChevronDown, PackageOpen } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useClerk } from "@clerk/nextjs";
import { useCart } from "@/components/providers/cart-provider";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/track", label: "Track Order" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const { count, open } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isSignedIn, signOut } = useClerk();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const role = (user?.publicMetadata?.role as string | undefined) ?? "customer";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="Amorino Café"
            width={36}
            height={34}
            priority
            className="h-9 w-auto"
          />
          <span className="font-display text-xl font-bold tracking-tight">
            Amorino <span className="text-primary">Café</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <WhatsAppButton className="hidden md:inline-flex" />

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            {isSignedIn && user ? (
              <>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-label="Account menu"
                  className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border bg-accent text-sm font-bold text-accent-foreground"
                >
                  {user.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (user.firstName?.[0] ?? "A")
                  )}
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-lg border bg-card shadow-lg"
                    >
                      <div className="border-b px-4 py-2.5">
                        <p className="truncate text-sm font-semibold">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground capitalize">{role}</p>
                      </div>
                      <Link
                        href="/account"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent"
                      >
                        <PackageOpen className="h-4 w-4" /> My Orders
                      </Link>
                      {(role === "owner" || role === "admin") && (
                        <Link
                          href="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent"
                        >
                          <LayoutDashboard className="h-4 w-4" /> Admin Dashboard
                        </Link>
                      )}
                      {role === "rider" && (
                        <Link
                          href="/rider"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent"
                        >
                          <ChevronDown className="h-4 w-4" /> Rider Portal
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => void signOut()}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10"
                      >
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <Link
                href="/sign-in"
                className="flex h-10 items-center rounded-md border px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Sign in
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={open}
            className="relative flex h-10 items-center gap-2 rounded-md border bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            aria-label="Open cart"
          >
            <ShoppingBag className="h-4 w-4" />
            <AnimatePresence mode="popLayout">
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 1 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-secondary-foreground"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
            Cart
          </button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-md border md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  {item.label}
                </Link>
              ))}
              <WhatsAppButton className="mt-1" />
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}