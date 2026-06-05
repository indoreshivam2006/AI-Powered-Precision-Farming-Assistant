"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Home, Sprout, Leaf, FlaskConical, Bot, Bell, User, Video, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium font-body">Loading Kisan Dashboard…</p>
      </div>
    }>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const session = localStorage.getItem("kisan_session");
    if (!session) {
      router.push("/");
    }
  }, [router]);

  const isOverview = pathname === "/dashboard";
  const current =
    navItems.find((n) =>
      n.exact ? pathname === n.href : pathname.startsWith(n.href)
    )?.label ?? "Overview";

  // Search logic
  const initialSearch = searchParams.get("search") || "";
  const [searchVal, setSearchVal] = useState(initialSearch);

  // Sync state if URL search param changes
  useEffect(() => {
    setSearchVal(searchParams.get("search") || "");
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/dashboard?search=${encodeURIComponent(searchVal)}`);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchVal(val);
    if (pathname === "/dashboard") {
      if (val.trim() === "") {
        router.replace("/dashboard");
      } else {
        router.replace(`/dashboard?search=${encodeURIComponent(val)}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 glass">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6 lg:gap-8">
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-deep text-primary-foreground">
                <Sprout className="h-4 w-4" />
              </span>
              <span className="font-display text-xl text-primary-deep">Kisan</span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1 text-[13px] font-body font-medium">
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
                      "relative px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap",
                      isActive
                        ? "text-primary-deep font-semibold bg-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {item.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary-deep" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="relative w-56 hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                value={searchVal}
                onChange={handleSearchChange}
                placeholder="Search Mandi prices…"
                className="h-9 w-full rounded-full bg-muted/50 pl-9 pr-4 text-xs font-body border border-border/40 focus:bg-background focus:border-primary/30 transition-all"
              />
            </form>

            <button className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200">
              <Bell className="h-4 w-4" />
            </button>
            <button className="grid h-9 w-9 place-items-center rounded-full bg-primary-deep text-primary-foreground hover:opacity-90 transition-all duration-200">
              <User className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Feature nav — mobile only, hidden on overview */}
        {!isOverview && (
          <nav className="lg:hidden border-t border-border/50 bg-background/60 glass">
            <div className="container">
              <div className="flex gap-1.5 overflow-x-auto py-2.5 scrollbar-none">
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
                        "inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-body font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-soft"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
        )}
      </header>

      {/* Page header — hidden on overview */}
      {!isOverview && (
        <div className="container pt-8 md:pt-10 pb-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-body font-semibold">Dashboard</p>
          <h1 className="mt-2 font-display text-display-lg text-foreground">{current}</h1>
        </div>
      )}

      <main className={cn("container pb-16 animate-fade-in", isOverview ? "pt-6 md:pt-8" : "pt-6")}>
        {children}
      </main>
    </div>
  );
}
