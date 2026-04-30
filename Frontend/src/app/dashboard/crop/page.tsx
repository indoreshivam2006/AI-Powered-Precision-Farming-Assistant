"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, FlaskConical, Sprout, Droplets, Thermometer, CloudRain, Atom, ChevronRight } from "lucide-react";
import { FeatureShell } from "@/components/FeatureShell";

// ── Types ────────────────────────────────────────────────────────────────────
interface CropResult {
  crop: string;
  confidence: string;
}

interface FertilizerResult {
  crop: string;
  area_hectares: number;
  soil_status: Record<string, string>;
  nutrient_requirement_per_ha: Record<string, number>;
  fertilizer_dose_per_ha: Record<string, number>;
  fertilizer_total_per_ha: number;
  fertilizer_for_area: Record<string, number>;
  micronutrients: Record<string, string>;
  application_schedule: string[];
  notes: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const CROP_EMOJI: Record<string, string> = {
  rice: "🌾", wheat: "🌾", maize: "🌽", cotton: "🪴", sugarcane: "🎋",
  banana: "🍌", mango: "🥭", grapes: "🍇", apple: "🍎", orange: "🍊",
  papaya: "🍈", coconut: "🥥", chickpea: "🫘", soybean: "🫘", lentil: "🫘",
  groundnut: "🥜", potato: "🥔", onion: "🧅", tomato: "🍅",
  pigeonpeas: "🫘", mothbeans: "🫘", mungbean: "🫘", blackgram: "🫘",
  kidneybeans: "🫘", coffee: "☕", jute: "🌿", watermelon: "🍉",
  muskmelon: "🍈", pomegranate: "🍎",
};

const statusColor: Record<string, string> = {
  low: "text-red-500 bg-red-50 dark:bg-red-900/20",
  medium: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
  high: "text-green-600 bg-green-50 dark:bg-green-900/20",
};

function confidenceToNum(c: string) {
  return parseFloat(c.replace("%", "")) || 0;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-[0.18em] font-semibold text-muted-foreground mb-3">
      {children}
    </p>
  );
}

function InfoChip({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-accent/60 px-3 py-2">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CropRecommendationPage() {
  const [tab, setTab] = useState<"crop" | "fertilizer">("crop");

  // Crop state
  const [cropLoading, setCropLoading] = useState(false);
  const [cropResult, setCropResult] = useState<CropResult | null>(null);
  const [cropError, setCropError] = useState<string | null>(null);
  const [lastInputs, setLastInputs] = useState<Record<string, number> | null>(null);

  // Fertilizer state
  const [fertLoading, setFertLoading] = useState(false);
  const [fertResult, setFertResult] = useState<FertilizerResult | null>(null);
  const [fertError, setFertError] = useState<string | null>(null);

  // ── Crop submit ──
  const handleCropSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCropLoading(true);
    setCropError(null);
    setCropResult(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      n:           parseFloat(fd.get("n") as string)        || 0,
      p:           parseFloat(fd.get("p") as string)        || 0,
      k:           parseFloat(fd.get("k") as string)        || 0,
      ph:          parseFloat(fd.get("ph") as string)       || 7.0,
      rainfall:    parseFloat(fd.get("rainfall") as string) || 0,
      temperature: parseFloat(fd.get("temperature") as string) || 25,
      humidity:    parseFloat(fd.get("humidity") as string) || 50,
    };

    setLastInputs(payload);

    try {
      const res = await fetch("http://localhost:8001/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to get recommendation");
      setCropResult(await res.json());
    } catch {
      setCropError("Crop model server is offline. Please ensure the backend is running on port 8001.");
    } finally {
      setCropLoading(false);
    }
  };

  // ── Fertilizer submit ──
  const handleFertSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFertLoading(true);
    setFertError(null);
    setFertResult(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      crop: (fd.get("crop") as string).toLowerCase().trim(),
      n:    parseFloat(fd.get("fn") as string)    || 0,
      p:    parseFloat(fd.get("fp") as string)    || 0,
      k:    parseFloat(fd.get("fk") as string)    || 0,
      area: parseFloat(fd.get("area") as string)  || 1,
    };

    try {
      const res = await fetch("http://localhost:8001/fertilizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to calculate fertilizer");
      }
      setFertResult(await res.json());
    } catch (err: any) {
      setFertError(err.message || "Fertilizer server is offline.");
    } finally {
      setFertLoading(false);
    }
  };

  const confNum = cropResult ? confidenceToNum(cropResult.confidence) : 0;
  const cropEmoji = cropResult ? (CROP_EMOJI[cropResult.crop.toLowerCase()] ?? "🌱") : "🌱";

  return (
    <FeatureShell intro="Enter your soil nutrients and local weather data. Our ML model will recommend the most suitable crop and optimal fertilizer blend for your land.">

      {/* ── Tab Toggle ── */}
      <div className="flex gap-2 mb-7 p-1 rounded-2xl bg-accent/50 w-fit">
        <button
          onClick={() => setTab("crop")}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
            tab === "crop"
              ? "bg-card shadow-soft text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sprout className="h-4 w-4" /> Crop Recommendation
        </button>
        <button
          onClick={() => setTab("fertilizer")}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
            tab === "fertilizer"
              ? "bg-card shadow-soft text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FlaskConical className="h-4 w-4" /> Fertilizer Optimizer
        </button>
      </div>

      {/* ════════════════════════════════════════
          TAB 1 — CROP RECOMMENDATION
      ════════════════════════════════════════ */}
      {tab === "crop" && (
        <>
          <form onSubmit={handleCropSubmit} className="space-y-6">

            {/* Soil NPK */}
            <div>
              <SectionTitle>Soil Nutrients (kg/ha)</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { id: "n", label: "Nitrogen (N)", placeholder: "e.g. 90" },
                  { id: "p", label: "Phosphorus (P)", placeholder: "e.g. 42" },
                  { id: "k", label: "Potassium (K)", placeholder: "e.g. 43" },
                ].map(f => (
                  <div key={f.id} className="grid gap-1.5">
                    <Label htmlFor={f.id} className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</Label>
                    <Input id={f.id} name={f.id} placeholder={f.placeholder} required type="number" step="any" min={0} className="h-11 rounded-xl bg-background" />
                  </div>
                ))}
              </div>
            </div>

            {/* Climate */}
            <div>
              <SectionTitle>Climate & Soil Conditions</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { id: "ph",          label: "Soil pH",         placeholder: "e.g. 6.5",  step: "0.1", min: "3.5", max: "9.5" },
                  { id: "rainfall",    label: "Rainfall (mm)",   placeholder: "e.g. 200",  step: "any", min: "0" },
                  { id: "temperature", label: "Temperature (°C)", placeholder: "e.g. 26",  step: "0.1", min: "-10", max: "55" },
                  { id: "humidity",    label: "Humidity (%)",    placeholder: "e.g. 65",   step: "any", min: "0", max: "100" },
                ].map(f => (
                  <div key={f.id} className="grid gap-1.5">
                    <Label htmlFor={f.id} className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</Label>
                    <Input id={f.id} name={f.id} placeholder={f.placeholder} required type="number"
                      step={f.step} min={f.min} max={f.max}
                      className="h-11 rounded-xl bg-background"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" size="lg" className="rounded-full px-8" disabled={cropLoading}>
              <Sparkles className="h-4 w-4 mr-2" />
              {cropLoading ? "Analyzing soil data…" : "Recommend Crop"}
            </Button>
          </form>

          {/* Error */}
          {cropError && (
            <div className="mt-6 rounded-2xl bg-destructive/10 border border-destructive/20 p-5 text-sm text-destructive">
              {cropError}
            </div>
          )}

          {/* Result Card */}
          {cropResult && (
            <div className="mt-8 animate-fade-up space-y-5">

              {/* Primary result */}
              <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-accent to-accent border border-primary/20 p-7 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                <span className="text-6xl leading-none">{cropEmoji}</span>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Recommended Crop</p>
                  <p className="font-display text-4xl capitalize text-foreground">{cropResult.crop}</p>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Model confidence</span>
                      <span className="font-semibold text-foreground">{cropResult.confidence}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-700"
                        style={{ width: `${confNum}%` }}
                      />
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full shrink-0"
                  onClick={() => {
                    setTab("fertilizer");
                  }}
                >
                  Get Fertilizer Plan <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>

              {/* Input summary chips */}
              {lastInputs && (
                <div>
                  <SectionTitle>Input Summary</SectionTitle>
                  <div className="flex flex-wrap gap-2">
                    <InfoChip label="Nitrogen" value={`${lastInputs.n} kg/ha`} icon={<Atom className="h-3.5 w-3.5" />} />
                    <InfoChip label="Phosphorus" value={`${lastInputs.p} kg/ha`} icon={<Atom className="h-3.5 w-3.5" />} />
                    <InfoChip label="Potassium" value={`${lastInputs.k} kg/ha`} icon={<Atom className="h-3.5 w-3.5" />} />
                    <InfoChip label="pH" value={lastInputs.ph} />
                    <InfoChip label="Rainfall" value={`${lastInputs.rainfall} mm`} icon={<CloudRain className="h-3.5 w-3.5" />} />
                    <InfoChip label="Temp" value={`${lastInputs.temperature}°C`} icon={<Thermometer className="h-3.5 w-3.5" />} />
                    <InfoChip label="Humidity" value={`${lastInputs.humidity}%`} icon={<Droplets className="h-3.5 w-3.5" />} />
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground rounded-xl border border-border bg-background px-4 py-3">
                💡 <strong className="text-foreground capitalize">{cropResult.crop}</strong> is optimally suited for your soil nutrients and climate conditions. Switch to the <strong className="text-foreground">Fertilizer Optimizer</strong> tab to get the exact fertilizer dose for this crop.
              </p>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════
          TAB 2 — FERTILIZER OPTIMIZER
      ════════════════════════════════════════ */}
      {tab === "fertilizer" && (
        <>
          <form onSubmit={handleFertSubmit} className="space-y-6">
            <div>
              <SectionTitle>Crop & Field</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5 sm:col-span-1">
                  <Label htmlFor="crop" className="text-xs uppercase tracking-wider text-muted-foreground">Crop Name</Label>
                  <Input id="crop" name="crop" placeholder="e.g. rice, wheat, maize…" required
                    className="h-11 rounded-xl bg-background" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="area" className="text-xs uppercase tracking-wider text-muted-foreground">Field Area (acres)</Label>
                  <Input id="area" name="area" placeholder="e.g. 2.5" required type="number" step="any" min={0.1} className="h-11 rounded-xl bg-background" />
                </div>
              </div>
            </div>

            <div>
              <SectionTitle>Current Soil NPK (kg/ha or mg/kg)</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { id: "fn", label: "Nitrogen (N)", placeholder: "e.g. 200" },
                  { id: "fp", label: "Phosphorus (P)", placeholder: "e.g. 12" },
                  { id: "fk", label: "Potassium (K)", placeholder: "e.g. 100" },
                ].map(f => (
                  <div key={f.id} className="grid gap-1.5">
                    <Label htmlFor={f.id} className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</Label>
                    <Input id={f.id} name={f.id} placeholder={f.placeholder} required type="number" step="any" min={0} className="h-11 rounded-xl bg-background" />
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" size="lg" className="rounded-full px-8" disabled={fertLoading}>
              <FlaskConical className="h-4 w-4 mr-2" />
              {fertLoading ? "Calculating…" : "Calculate Fertilizer Plan"}
            </Button>
          </form>

          {fertError && (
            <div className="mt-6 rounded-2xl bg-destructive/10 border border-destructive/20 p-5 text-sm text-destructive">
              {fertError}
            </div>
          )}

          {fertResult && (
            <div className="mt-8 space-y-5 animate-fade-up">

              {/* Header */}
              <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 via-accent to-accent border border-emerald-500/20 p-6 flex items-center gap-4">
                <FlaskConical className="h-10 w-10 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fertilizer Plan for</p>
                  <p className="font-display text-2xl capitalize text-foreground">{fertResult.crop}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Area: {fertResult.area_hectares.toFixed(2)} ha &nbsp;|&nbsp;
                    Total: <strong className="text-foreground">{fertResult.fertilizer_total_per_ha} kg/ha</strong>
                  </p>
                </div>
              </div>

              {/* Soil status */}
              <div>
                <SectionTitle>Soil NPK Status (ICAR)</SectionTitle>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(fertResult.soil_status).map(([n, s]) => (
                    <span key={n} className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${statusColor[s] ?? ""}`}>
                      {n}: {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Fertilizer quantities for area */}
              <div>
                <SectionTitle>Fertilizer for Your Area</SectionTitle>
                <div className="grid gap-3 sm:grid-cols-3">
                  {Object.entries(fertResult.fertilizer_for_area)
                    .filter(([k]) => k !== "total")
                    .map(([name, dose]) => (
                      <div key={name} className="rounded-2xl bg-accent border border-border p-5 text-center">
                        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{name}</p>
                        <p className="mt-2 font-display text-3xl text-foreground">{dose} <span className="text-base font-normal text-muted-foreground">kg</span></p>
                      </div>
                    ))}
                </div>
                {fertResult.fertilizer_for_area.total && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Total fertilizer needed: <strong className="text-foreground">{fertResult.fertilizer_for_area.total} kg</strong>
                  </p>
                )}
              </div>

              {/* Per-ha requirements */}
              <div>
                <SectionTitle>Nutrient Requirement per Hectare</SectionTitle>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(fertResult.nutrient_requirement_per_ha).map(([n, v]) => (
                    <InfoChip key={n} label={n} value={`${v} kg/ha`} />
                  ))}
                </div>
              </div>

              {/* Application schedule */}
              <div>
                <SectionTitle>Application Schedule</SectionTitle>
                <div className="rounded-2xl border border-border bg-background p-5 space-y-2">
                  {fertResult.application_schedule.map((s, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <span className="shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold grid place-items-center">
                        {i + 1}
                      </span>
                      <span className="text-foreground pt-0.5">{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Micronutrients */}
              {Object.keys(fertResult.micronutrients).length > 0 && (
                <div>
                  <SectionTitle>Micronutrient Recommendations</SectionTitle>
                  <div className="rounded-2xl border border-border bg-background p-5 grid gap-2 sm:grid-cols-2">
                    {Object.entries(fertResult.micronutrients).map(([micro, rec]) => (
                      <div key={micro} className="flex gap-2 text-sm">
                        <span className="font-semibold text-foreground w-6 shrink-0">{micro}</span>
                        <span className="text-muted-foreground">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ICAR Notes */}
              <div>
                <SectionTitle>ICAR Expert Notes</SectionTitle>
                <ul className="space-y-2">
                  {fertResult.notes.map((note, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-base leading-5 shrink-0">→</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </FeatureShell>
  );
}
