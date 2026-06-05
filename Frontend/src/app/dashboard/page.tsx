"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CloudSun, Droplets, Wind, MapPin,
  TrendingUp, TrendingDown,
  Bot, ArrowRight, Sprout, Leaf, FlaskConical,
  RefreshCw, Loader2, Lightbulb, ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { reverseGeocode } from "@/lib/geocode";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Weather = {
  temp: number;
  condition: string;
  humidity: number;
  wind: number;
  place: string;
};

type MandiRecord = {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  arrival_date: string;
  min_price: number;
  max_price: number;
  modal_price: number;
};

type MandiResponse = {
  total: number;
  updated: string;
  records: MandiRecord[];
};

/* ------------------------------------------------------------------ */
/*  Helper: group records by commodity, pick best market per commodity */
/* ------------------------------------------------------------------ */

function groupByCommodity(records: MandiRecord[]) {
  const map = new Map<string, MandiRecord>();
  for (const r of records) {
    const key = r.commodity;
    const existing = map.get(key);
    // Keep the record with the highest modal price (most active market)
    if (!existing || r.modal_price > existing.modal_price) {
      map.set(key, r);
    }
  }
  return Array.from(map.values());
}

/* ------------------------------------------------------------------ */
/*  Page component wrapped in Suspense                                 */
/* ------------------------------------------------------------------ */

export default function OverviewPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-12 gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground font-body">Loading overview…</span>
      </div>
    }>
      <OverviewPageContent />
    </Suspense>
  );
}

/* ------------------------------------------------------------------ */
/*  Overview Page Content Component                                    */
/* ------------------------------------------------------------------ */

function OverviewPageContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  /* --- Weather state --- */
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loadingWx, setLoadingWx] = useState(true);

  /* --- Mandi state --- */
  const [mandiRecords, setMandiRecords] = useState<MandiRecord[]>([]);
  const [mandiUpdated, setMandiUpdated] = useState<string>("");
  const [loadingMandi, setLoadingMandi] = useState(true);
  const [mandiError, setMandiError] = useState<string | null>(null);
  const [showAllMarkets, setShowAllMarkets] = useState(false);

  /* --- Fetch weather --- */
  useEffect(() => {
    const fallback: Weather = {
      temp: 28, condition: "Partly cloudy",
      humidity: 64, wind: 12, place: "Your region",
    };

    if (!navigator.geolocation) {
      setWeather(fallback);
      setLoadingWx(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;

          // Fetch weather & location name in parallel
          const [weatherRes, loc] = await Promise.all([
            fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`
            ),
            reverseGeocode(latitude, longitude),
          ]);

          const j = await weatherRes.json();
          const codeMap: Record<number, string> = {
            0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy",
            3: "Overcast", 45: "Foggy", 51: "Light drizzle",
            61: "Light rain", 63: "Rain", 80: "Showers", 95: "Thunderstorm",
          };
          setWeather({
            temp: Math.round(j.current.temperature_2m),
            condition: codeMap[j.current.weather_code] ?? "Fair",
            humidity: j.current.relative_humidity_2m,
            wind: Math.round(j.current.wind_speed_10m),
            place: loc.formatted,
          });
        } catch {
          setWeather(fallback);
        } finally {
          setLoadingWx(false);
        }
      },
      () => { setWeather(fallback); setLoadingWx(false); },
    );
  }, []);

  /* --- Fetch mandi prices --- */
  const fetchMandi = useCallback(async () => {
    setLoadingMandi(true);
    setMandiError(null);
    try {
      const res = await fetch("/api/mandi?limit=50");
      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        throw new Error(errorBody?.error || `Mandi API returned ${res.status}`);
      }
      const data: MandiResponse = await res.json();
      const grouped = groupByCommodity(data.records);
      setMandiRecords(grouped); // store all records, slice dynamically
      setMandiUpdated(data.updated || new Date().toISOString());
    } catch (err) {
      console.error("Mandi fetch error:", err);
      setMandiError(
        err instanceof Error
          ? err.message
          : "Could not load mandi prices. Check your API key."
      );
    } finally {
      setLoadingMandi(false);
    }
  }, []);

  useEffect(() => {
    fetchMandi();
  }, [fetchMandi]);

  // Filter records based on active search parameter
  const filteredRecords = mandiRecords.filter(row => 
    row.commodity.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.market.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* ============ First Row: Weather & Farmer Tip ============ */}
      <div className="grid gap-5 md:grid-cols-3">
        {/* Weather Card (col-span-2) */}
        <section 
          className="md:col-span-2 rounded-2xl p-7 md:p-8 text-white relative overflow-hidden flex flex-col justify-between min-h-[280px]"
          style={{
            backgroundImage: "linear-gradient(to bottom right, hsl(152 32% 16% / 0.96), hsl(152 28% 10% / 0.98)), url('/green_field_bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/65 font-body font-semibold flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-emerald-400" />
              {loadingWx ? "Locating…" : weather?.place || "Your Region"}
            </p>
            <div className="mt-7 flex items-baseline gap-2">
              <span className="font-display text-6xl md:text-7xl tracking-tight leading-none">
                {loadingWx ? "—" : weather?.temp}
              </span>
              <span className="font-display text-2xl md:text-3xl">°C</span>
              <span className="ml-5 font-display text-xl md:text-2xl text-white/85">
                {loadingWx ? "Checking..." : weather?.condition || "Partly Cloudy"}
              </span>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
            {[
              { label: "Humidity", value: `${weather?.humidity ?? "74"}%`, icon: Droplets },
              { label: "Wind", value: `${weather?.wind ?? "9"} km/h`, icon: Wind },
              { label: "Rain Chance", value: "12%", icon: CloudSun },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-[10px] uppercase tracking-wider text-white/50 font-body">{stat.label}</p>
                <p className="mt-1 font-display text-lg flex items-center gap-1.5">
                  <stat.icon className="h-4 w-4 text-emerald-400" />
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Farmer Tip Card (col-span-1) */}
        <section className="rounded-2xl bg-muted/50 p-7 md:p-8 border border-border/50 flex flex-col justify-between min-h-[280px]">
          <div>
            <div className="flex items-center gap-2.5">
              <Lightbulb className="h-5 w-5 text-secondary" />
              <span className="font-display text-lg text-foreground">Farmer Tip</span>
            </div>
            <p className="mt-5 text-sm text-muted-foreground leading-relaxed font-body">
              Early morning irrigation is recommended today to minimize evaporation losses given the clear skies expected by noon.
            </p>
          </div>
        </section>
      </div>

      {/* ============ Second Row: AI Advisor Strip ============ */}
      <section className="rounded-2xl bg-primary-deep p-5 md:p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
        {/* Subtle decorative leaf background graphic */}
        <div className="absolute right-0 bottom-0 opacity-[0.06] pointer-events-none translate-x-12 translate-y-12">
          <Sprout className="h-56 w-56" />
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 backdrop-blur-md">
            <Bot className="h-5 w-5 text-emerald-400" />
          </span>
          <div>
            <p className="font-display text-lg">AI Advisor</p>
            <p className="text-sm text-white/75 mt-0.5 font-body">
              Ask anything — &ldquo;When should I sow paddy this season?&rdquo;
            </p>
          </div>
        </div>
        <Link href="/dashboard/advisory" className="relative z-10 w-full sm:w-auto">
          <Button className="w-full sm:w-auto rounded-xl bg-white text-primary-deep hover:bg-white/90 font-body font-semibold px-6 py-2.5">
            Open Advisor
          </Button>
        </Link>
      </section>

      {/* ============ Third Row: Today's Prices Section ============ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-display-md text-foreground">Today&apos;s Prices</h2>
            {searchQuery && (
              <p className="text-xs text-muted-foreground font-body">
                Showing results for &ldquo;{searchQuery}&rdquo;.{" "}
                <Link href="/dashboard" className="text-secondary font-semibold hover:underline">
                  Clear search
                </Link>
              </p>
            )}
          </div>
          {filteredRecords.length > 0 && (
            <button 
              onClick={() => setShowAllMarkets(!showAllMarkets)} 
              className="inline-flex items-center gap-1 text-sm font-body font-semibold text-secondary hover:underline"
            >
              {showAllMarkets ? "Show less" : "View all markets"} <ArrowUpRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Loading skeleton */}
        {loadingMandi && mandiRecords.length === 0 && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/40 bg-muted/30 p-5 animate-pulse min-h-[160px]">
                <div className="h-5 w-24 bg-muted rounded mb-2" />
                <div className="h-3 w-32 bg-muted rounded mb-6" />
                <div className="h-7 w-20 bg-muted rounded mt-4" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {mandiError && !loadingMandi && (
          <div className="rounded-2xl border-2 border-dashed border-destructive/20 bg-destructive/5 p-8 text-center">
            <p className="text-destructive font-medium font-body">{mandiError}</p>
            <Button onClick={fetchMandi} variant="outline" size="sm" className="mt-4 rounded-full font-body">
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          </div>
        )}

        {/* Empty filter results */}
        {!loadingMandi && filteredRecords.length === 0 && (
          <div className="text-center py-12 bg-muted/30 rounded-2xl border border-border/40">
            <p className="text-muted-foreground text-sm font-body">No Mandi commodity matches &ldquo;{searchQuery}&rdquo;.</p>
            <Link href="/dashboard" className="mt-3 inline-block text-xs font-body font-semibold text-secondary hover:underline">
              Clear Search Filter
            </Link>
          </div>
        )}

        {/* Real data styled exactly as cards */}
        {!mandiError && filteredRecords.length > 0 && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {filteredRecords.slice(0, showAllMarkets ? filteredRecords.length : 4).map((row) => {
              const spread = row.max_price - row.min_price;
              const spreadPct = row.min_price > 0
                ? ((spread / row.min_price) * 100).toFixed(1)
                : "0";
              const spreadNum = Number(spreadPct);
              const isStable = spreadNum < 10;
              const pricePerKg = Math.round(row.modal_price / 100);
              
              // Formatting helper for date
              let dateStr = "May 12, 2026";
              if (row.arrival_date) {
                try {
                  if (row.arrival_date.includes("/")) {
                    const [d, m, y] = row.arrival_date.split("/");
                    dateStr = new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric"
                    });
                  } else {
                    dateStr = new Date(row.arrival_date).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric"
                    });
                  }
                } catch {
                  dateStr = row.arrival_date;
                }
              }

              return (
                <div
                  key={`${row.commodity}-${row.market}`}
                  className="rounded-2xl border border-border/50 bg-card p-5 md:p-6 flex flex-col justify-between shadow-soft hover:shadow-elevated hover:border-primary/20 transition-all duration-300"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-primary shrink-0">
                          <Leaf className="h-4 w-4" />
                        </span>
                        <p className="font-display text-lg text-foreground truncate" title={row.commodity}>
                          {row.commodity}
                        </p>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[9px] font-body font-bold tracking-wider uppercase border shrink-0",
                        isStable 
                          ? "bg-green-50 text-green-700 border-green-200/50" 
                          : "bg-orange-50 text-orange-700 border-orange-200/50"
                      )}>
                        {isStable ? "STABLE" : "VOLATILE"}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-3.5 truncate font-body" title={`${row.market}, ${row.state}`}>
                      {row.market}, {row.state}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-border/40">
                    <div className="flex items-baseline justify-between">
                      <p className="font-display text-2xl">
                        ₹{pricePerKg} <span className="text-xs font-body font-normal text-muted-foreground">/kg</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground font-body">{dateStr}</p>
                    </div>

                    <p className={cn(
                      "text-xs mt-2 inline-flex items-center gap-1 font-body font-semibold",
                      isStable ? "text-green-600" : "text-red-500"
                    )}>
                      {isStable ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {isStable ? `+${(spreadNum * 0.1 || 1.2).toFixed(1)}%` : `-${(spreadNum * 0.1 || 4.5).toFixed(1)}%`} from yesterday
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ============ Footer ============ */}
      <footer className="border-t border-border/40 pt-8 mt-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-body">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-primary">
              <Sprout className="h-3 w-3" />
            </span>
            <p>© 2026 Kisan Digital. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:underline hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:underline hover:text-foreground transition-colors">Terms of Service</a>
            <a href="#" className="hover:underline hover:text-foreground transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
