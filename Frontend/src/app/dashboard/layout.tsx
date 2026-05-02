"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sprout, Leaf, FlaskConical, Bot, Bell, User, Video } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: Home, exact: true },
  { href: "/dashboard/crop", label: "Crop Recommendation", icon: Sprout },
  { href: "/dashboard/disease", label: "Plant Disease Predict", icon: Leaf },
  { href: "/dashboard/live-detect", label: "Live Detection", icon: Video },
  { href: "/dashboard/fertilizer", label: "Fertilizer Optimizer", icon: FlaskConical },
  { href: "/dashboard/advisory", label: "AI Advisory Agent", icon: Bot },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const current =
    navItems.find((n) =>
      n.exact ? pathname === n.href : pathname.startsWith(n.href)
    )?.label ?? "Overview";

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground">
              <Sprout className="h-4 w-4" />
            </span>
            <span className="font-display text-lg">Kisan</span>
          </Link>

          <div className="flex items-center gap-2">
            <button className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-smooth">
              <Bell className="h-4 w-4" />
            </button>
            <button className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
              <User className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Feature nav */}
        <nav className="border-t border-border bg-background/60">
          <div className="container">
            <div className="flex gap-1 overflow-x-auto py-2 scrollbar-none">
              {navItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href) &&
                    (item.href !== "/dashboard" || pathname === "/dashboard");

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-smooth",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      </header>

      {/* Page header */}
      <div className="container pt-10 pb-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Dashboard</p>
        <h1 className="mt-2 font-display text-4xl md:text-5xl">{current}</h1>
      </div>

      <main className="container pb-16 pt-6 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
