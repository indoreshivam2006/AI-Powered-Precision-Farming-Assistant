"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlaskConical, Atom } from "lucide-react";
import { FeatureShell } from "@/components/FeatureShell";

// ── Types ────────────────────────────────────────────────────────────────────
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

// ── Helpers ──────────────────────────────────────────────────────────────────
const statusColor: Record<string, string> = {
  low: "text-red-500 bg-red-50 dark:bg-red-900/20",
  medium: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
  high: "text-green-600 bg-green-50 dark:bg-green-900/20",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-[0.2em] font-body font-semibold text-muted-foreground mb-3">
      {children}
    </p>
  );
}

function InfoChip({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-accent/60 px-3.5 py-2.5">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body">{label}</p>
        <p className="text-sm font-semibold text-foreground font-body">{value}</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FertilizerOptimizerPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FertilizerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      crop: (formData.get("crop") as string).toLowerCase().trim(),
      n: parseFloat(formData.get("n") as string) || 0,
      p: parseFloat(formData.get("p") as string) || 0,
      k: parseFloat(formData.get("k") as string) || 0,
      area: parseFloat(formData.get("area") as string) || 1,
    };

    try {
      const res = await fetch("/api/backend/crop/fertilizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to calculate fertilizer dose");
      }

      const data: FertilizerResult = await res.json();
      setResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Fertilizer server is offline. Please ensure the crop recommendation backend is running.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FeatureShell intro="Match the right nutrient blend to your soil and chosen crop. Spend less, harvest more.">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <SectionTitle>Crop &amp; Field</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-1">
              <Label htmlFor="crop" className="text-[11px] uppercase tracking-wider text-muted-foreground font-body">Crop Name</Label>
              <Input id="crop" name="crop" placeholder="e.g. rice, wheat, maize…" required className="h-11 rounded-xl bg-background" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="area" className="text-[11px] uppercase tracking-wider text-muted-foreground font-body">Field Area (acres)</Label>
              <Input id="area" name="area" placeholder="e.g. 2.5" required type="number" step="any" min={0.1} className="h-11 rounded-xl bg-background" />
            </div>
          </div>
        </div>

        <div>
          <SectionTitle>Current Soil NPK (kg/ha or mg/kg)</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { id: "n", label: "Nitrogen (N)", placeholder: "e.g. 200" },
              { id: "p", label: "Phosphorus (P)", placeholder: "e.g. 12" },
              { id: "k", label: "Potassium (K)", placeholder: "e.g. 100" },
            ].map(f => (
              <div key={f.id} className="grid gap-1.5">
                <Label htmlFor={f.id} className="text-[11px] uppercase tracking-wider text-muted-foreground font-body">{f.label}</Label>
                <Input id={f.id} name={f.id} placeholder={f.placeholder} required type="number" step="any" min={0} className="h-11 rounded-xl bg-background" />
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" size="lg" className="rounded-full px-8" disabled={loading}>
          <FlaskConical className="h-4 w-4 mr-2" />
          {loading ? "Calculating…" : "Calculate Fertilizer Plan"}
        </Button>
      </form>

      {error && (
        <div className="mt-6 rounded-2xl bg-destructive/10 border border-destructive/20 p-5 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-5 animate-fade-up">

          {/* Header */}
          <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 via-accent to-accent border border-emerald-500/20 p-6 flex items-center gap-4">
            <FlaskConical className="h-10 w-10 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fertilizer Plan for</p>
              <p className="font-display text-2xl capitalize text-foreground">{result.crop}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Area: {result.area_hectares.toFixed(2)} ha &nbsp;|&nbsp;
                Total: <strong className="text-foreground">{result.fertilizer_total_per_ha} kg/ha</strong>
              </p>
            </div>
          </div>

          {/* Soil status */}
          {result.soil_status && Object.keys(result.soil_status).length > 0 && (
            <div>
              <SectionTitle>Soil NPK Status (ICAR)</SectionTitle>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(result.soil_status).map(([n, s]) => (
                  <span key={n} className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${statusColor[s] ?? ""}`}>
                    {n}: {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Fertilizer quantities for area */}
          <div>
            <SectionTitle>Fertilizer for Your Area</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-3">
              {Object.entries(result.fertilizer_for_area)
                .filter(([k]) => k !== "total")
                .map(([name, dose]) => (
                  <div key={name} className="rounded-2xl bg-accent border border-border p-5 text-center">
                    <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{name}</p>
                    <p className="mt-2 font-display text-3xl text-foreground">{dose} <span className="text-base font-normal text-muted-foreground">kg</span></p>
                  </div>
                ))}
            </div>
            {result.fertilizer_for_area.total && (
              <p className="mt-3 text-sm text-muted-foreground">
                Total fertilizer needed: <strong className="text-foreground">{result.fertilizer_for_area.total} kg</strong>
              </p>
            )}
          </div>

          {/* Per-ha requirements */}
          {result.nutrient_requirement_per_ha && Object.keys(result.nutrient_requirement_per_ha).length > 0 && (
            <div>
              <SectionTitle>Nutrient Requirement per Hectare</SectionTitle>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(result.nutrient_requirement_per_ha).map(([n, v]) => (
                  <InfoChip key={n} label={n} value={`${v} kg/ha`} icon={<Atom className="h-3.5 w-3.5" />} />
                ))}
              </div>
            </div>
          )}

          {/* Application schedule */}
          {result.application_schedule && result.application_schedule.length > 0 && (
            <div>
              <SectionTitle>Application Schedule</SectionTitle>
              <div className="rounded-2xl border border-border bg-background p-5 space-y-2">
                {result.application_schedule.map((s, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <span className="shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold grid place-items-center">
                      {i + 1}
                    </span>
                    <span className="text-foreground pt-0.5">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Micronutrients */}
          {result.micronutrients && Object.keys(result.micronutrients).length > 0 && (
            <div>
              <SectionTitle>Micronutrient Recommendations</SectionTitle>
              <div className="rounded-2xl border border-border bg-background p-5 grid gap-2 sm:grid-cols-2">
                {Object.entries(result.micronutrients).map(([micro, rec]) => (
                  <div key={micro} className="flex gap-2 text-sm">
                    <span className="font-semibold text-foreground w-6 shrink-0">{micro}</span>
                    <span className="text-muted-foreground">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ICAR Notes */}
          {result.notes && result.notes.length > 0 && (
            <div>
              <SectionTitle>ICAR Expert Notes</SectionTitle>
              <ul className="space-y-2">
                {result.notes.map((note, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-base leading-5 shrink-0">→</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </FeatureShell>
  );
}
