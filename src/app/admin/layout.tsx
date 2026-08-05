import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  Bike,
  BarChart3,
  Star,
  AlertTriangle,
  Settings,
  Coffee,
  Map as MapIcon,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin Dashboard" };

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/admin/riders", label: "Riders", icon: Bike },
  { href: "/admin/map", label: "Live Map", icon: MapIcon },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/complaints", label: "Complaints", icon: AlertTriangle },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "owner" && user.role !== "admin") redirect("/");

  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
      <aside className="sticky top-24 hidden h-fit w-48 shrink-0 flex-col gap-1 lg:flex">
        <div className="mb-3 flex items-center gap-2 px-2">
          <Coffee className="h-5 w-5 text-primary" />
          <span className="font-bold">Amorino Admin</span>
        </div>
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </aside>

      <aside className="fixed inset-x-0 bottom-0 z-40 border-t bg-background lg:hidden">
        <nav className="flex overflow-x-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-w-[64px] flex-1 flex-col items-center gap-1 px-2 py-2 text-[10px] font-medium text-muted-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 pb-20 lg:pb-6">{children}</div>
    </div>
  );
}