"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  CloudSun, Droplets, Wind, MapPin,
  TrendingUp, TrendingDown,
  Bot, ArrowRight, Sprout, Leaf, FlaskConical,
  RefreshCw, Loader2,
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
/*  Quick actions                                                      */
/* ------------------------------------------------------------------ */

const quickActions = [
  { href: "/dashboard/crop", label: "Recommend a crop", icon: Sprout },
  { href: "/dashboard/disease", label: "Diagnose a leaf", icon: Leaf },
  { href: "/dashboard/fertilizer", label: "Plan fertilizer", icon: FlaskConical },
];

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
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function OverviewPage() {
  /* --- Weather state --- */
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loadingWx, setLoadingWx] = useState(true);

  /* --- Mandi state --- */
  const [mandiRecords, setMandiRecords] = useState<MandiRecord[]>([]);
  const [mandiUpdated, setMandiUpdated] = useState<string>("");
  const [loadingMandi, setLoadingMandi] = useState(true);
  const [mandiError, setMandiError] = useState<string | null>(null);

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
      setMandiRecords(grouped.slice(0, 12)); // show up to 12 commodities
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

  /* --- Format the updated date --- */
  const updatedLabel = mandiUpdated
    ? (() => {
        try {
          // data.gov.in returns dates like "28/04/2026" or ISO
          if (mandiUpdated.includes("/")) {
            return `Updated ${mandiUpdated}`;
          }
          return `Updated ${new Date(mandiUpdated).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
          })}`;
        } catch { return "Updated recently"; }
      })()
    : "Loading…";

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="grid gap-5 lg:grid-cols-3">

      {/* ============ Weather ============ */}
      <section className="lg:col-span-2 rounded-3xl bg-primary-deep p-8 text-background shadow-elevated relative overflow-hidden">
        <div className="absolute inset-0 bg-grain opacity-30" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-background/70">Weather now</p>
              <div className="mt-1 flex items-center gap-2 text-sm text-background/80">
                <MapPin className="h-3.5 w-3.5" />
                {loadingWx ? "Locating…" : weather?.place}
              </div>
            </div>
            <CloudSun className="h-12 w-12 text-background/80 animate-float" />
          </div>

          <div className="mt-8 flex items-end gap-3">
            <span className="font-display text-7xl leading-none">
              {loadingWx ? "—" : weather?.temp}
            </span>
            <span className="font-display text-3xl mb-2">°C</span>
          </div>
          <p className="mt-2 font-display italic text-xl text-background/90">
            {weather?.condition}
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 max-w-md">
            <div className="rounded-2xl bg-background/10 backdrop-blur p-4">
              <div className="flex items-center gap-2 text-background/70 text-xs">
                <Droplets className="h-3.5 w-3.5" /> Humidity
              </div>
              <p className="mt-1 font-display text-2xl">{weather?.humidity ?? "—"}%</p>
            </div>
            <div className="rounded-2xl bg-background/10 backdrop-blur p-4">
              <div className="flex items-center gap-2 text-background/70 text-xs">
                <Wind className="h-3.5 w-3.5" /> Wind
              </div>
              <p className="mt-1 font-display text-2xl">{weather?.wind ?? "—"} km/h</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ AI advisory teaser ============ */}
      <section className="rounded-3xl bg-gradient-card p-7 shadow-soft border border-border flex flex-col">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-secondary-foreground">
            <Bot className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">AI Advisor</p>
            <p className="font-display text-lg">Ask anything</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed flex-1">
          &ldquo;When should I sow paddy this season?&rdquo; &ldquo;Why are my tomato leaves yellow?&rdquo; Ask in plain words — get clear answers.
        </p>
        <Link href="/dashboard/advisory" className="mt-5">
          <Button variant="default" className="w-full rounded-full">
            Open Advisor <ArrowRight />
          </Button>
        </Link>
        <div className="mt-5 grid gap-2">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-accent transition-smooth"
            >
              <span className="flex items-center gap-2.5 text-foreground">
                <a.icon className="h-4 w-4 text-primary" /> {a.label}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </section>

      {/* ============ Real-time Mandi Prices ============ */}
      <section className="lg:col-span-3 rounded-3xl bg-card p-8 shadow-soft border border-border">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Mandi market — live
            </p>
            <h2 className="mt-1 font-display text-3xl">Today&apos;s prices</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              <span className={cn(
                "h-2 w-2 rounded-full",
                loadingMandi ? "bg-muted-foreground animate-pulse" :
                mandiError ? "bg-destructive" : "bg-primary animate-pulse"
              )} />
              {loadingMandi ? "Fetching…" : mandiError ? "Offline" : updatedLabel}
            </span>
            <button
              onClick={fetchMandi}
              disabled={loadingMandi}
              className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-smooth disabled:opacity-50"
              title="Refresh prices"
            >
              <RefreshCw className={cn("h-4 w-4", loadingMandi && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Loading skeleton */}
        {loadingMandi && mandiRecords.length === 0 && (
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-background p-5 animate-pulse">
                <div className="h-5 w-24 bg-muted rounded mb-2" />
                <div className="h-3 w-32 bg-muted rounded mb-4" />
                <div className="h-7 w-20 bg-muted rounded ml-auto" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {mandiError && !loadingMandi && (
          <div className="mt-6 rounded-2xl border-2 border-dashed border-destructive/30 bg-destructive/5 p-8 text-center">
            <p className="text-destructive font-medium">{mandiError}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Set <code className="bg-muted px-1.5 py-0.5 rounded text-xs">DATA_GOV_API_KEY</code> in{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Frontend/.env.local</code>, then restart Next.js.
            </p>
            <Button onClick={fetchMandi} variant="outline" size="sm" className="mt-4 rounded-full">
              <RefreshCw className="h-3 w-3" /> Retry
            </Button>
          </div>
        )}

        {/* Real data */}
        {!mandiError && mandiRecords.length > 0 && (
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {mandiRecords.map((row) => {
              const spread = row.max_price - row.min_price;
              const spreadPct = row.min_price > 0
                ? ((spread / row.min_price) * 100).toFixed(1)
                : "0";
              const up = Number(spreadPct) >= 0;

              return (
                <div
                  key={`${row.commodity}-${row.market}`}
                  className="group flex items-center justify-between rounded-2xl border border-border bg-background p-5 transition-smooth hover:border-primary hover:shadow-soft"
                >
                  <div className="min-w-0">
                    <p className="font-display text-xl truncate">{row.commodity}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {row.market}, {row.state}
                    </p>
                    {row.arrival_date && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {row.arrival_date}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="font-display text-2xl">
                      ₹{row.modal_price.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      ₹{row.min_price.toLocaleString("en-IN")} – ₹{row.max_price.toLocaleString("en-IN")}
                    </p>
                    <p className={cn(
                      "text-xs mt-0.5 inline-flex items-center gap-1",
                      up ? "text-primary" : "text-destructive"
                    )}>
                      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      ±{spreadPct}% spread • ₹/qtl
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Source attribution */}
        {!mandiError && mandiRecords.length > 0 && (
          <p className="mt-4 text-[10px] text-muted-foreground/50 text-right">
            Source: data.gov.in / Agmarknet — Refreshes every 5 min
          </p>
        )}
      </section>
    </div>
  );
}
