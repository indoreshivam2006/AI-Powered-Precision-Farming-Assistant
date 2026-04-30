"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlaskConical } from "lucide-react";
import { FeatureShell } from "@/components/FeatureShell";

export default function FertilizerOptimizerPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      crop: formData.get("crop") as string,
      n: parseFloat(formData.get("n") as string) || 0,
      p: parseFloat(formData.get("p") as string) || 0,
      k: parseFloat(formData.get("k") as string) || 0,
      area: parseFloat(formData.get("area") as string) || 1,
    };

    try {
      const res = await fetch("http://localhost:8001/fertilizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to calculate fertilizer dose");
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Model server is offline. Please ensure the crop recommendation backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FeatureShell intro="Match the right nutrient blend to your soil and chosen crop. Spend less, harvest more.">
      <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="crop" className="text-xs uppercase tracking-wider text-muted-foreground">Crop</Label>
          <Input id="crop" name="crop" placeholder="e.g. Wheat" required className="h-11 rounded-xl bg-background" />
        </div>
        <div className="grid gap-2"><Label htmlFor="n" className="text-xs uppercase tracking-wider text-muted-foreground">Soil N</Label><Input id="n" name="n" required type="number" step="any" placeholder="e.g. 60" className="h-11 rounded-xl bg-background" /></div>
        <div className="grid gap-2"><Label htmlFor="p" className="text-xs uppercase tracking-wider text-muted-foreground">Soil P</Label><Input id="p" name="p" required type="number" step="any" placeholder="e.g. 30" className="h-11 rounded-xl bg-background" /></div>
        <div className="grid gap-2"><Label htmlFor="k" className="text-xs uppercase tracking-wider text-muted-foreground">Soil K</Label><Input id="k" name="k" required type="number" step="any" placeholder="e.g. 25" className="h-11 rounded-xl bg-background" /></div>
        <div className="grid gap-2"><Label htmlFor="area" className="text-xs uppercase tracking-wider text-muted-foreground">Field area (acres)</Label><Input id="area" name="area" required type="number" step="any" placeholder="e.g. 2" className="h-11 rounded-xl bg-background" /></div>
        <div className="sm:col-span-2 mt-2">
          <Button type="submit" variant="default" size="lg" className="rounded-full" disabled={loading}>
            <FlaskConical /> {loading ? "Optimizing..." : "Optimize"}
          </Button>
        </div>
      </form>

      {error && (
        <div className="mt-8 rounded-2xl bg-destructive/10 p-6 text-destructive animate-fade-up">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-6 animate-fade-up">
          <div className="grid gap-3 sm:grid-cols-3">
            {Object.entries(result.fertilizer_for_area)
              .filter(([name]) => name !== 'total')
              .map(([name, dose]) => (
              <div key={name} className="rounded-2xl bg-accent p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-accent-foreground/70">{name}</p>
                <p className="mt-2 font-display text-2xl text-accent-foreground">{dose as number} kg</p>
              </div>
            ))}
          </div>
          
          <div className="rounded-2xl border border-border p-5 bg-background">
            <h4 className="text-sm font-semibold mb-3">Application Schedule</h4>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
              {result.application_schedule.map((schedule: string, idx: number) => (
                <li key={idx}>{schedule.replace('",', '').replace('"', '')}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </FeatureShell>
  );
}
