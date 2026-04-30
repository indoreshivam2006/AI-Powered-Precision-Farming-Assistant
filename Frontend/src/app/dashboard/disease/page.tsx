"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Leaf } from "lucide-react";
import { FeatureShell } from "@/components/FeatureShell";

export default function PlantDiseasePage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ disease: string; confidence: string; treatment: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (f: File | undefined) => {
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
    
    // Convert to base64 for the API
    const reader = new FileReader();
    reader.onloadend = () => {
      setBase64Image(reader.result as string);
    };
    reader.readAsDataURL(f);
  };

  const handleDiagnose = async () => {
    if (!base64Image) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Connect to the Disease Prediction FastAPI backend
      const res = await fetch("http://localhost:8000/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });

      if (!res.ok) throw new Error("Failed to reach prediction server");

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError("Model server is offline. Please ensure the disease prediction backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FeatureShell intro="Upload a clear photo of an affected leaf. We'll diagnose the disease and suggest a treatment plan.">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}
        className="cursor-pointer rounded-2xl border-2 border-dashed border-border bg-background p-10 text-center transition-smooth hover:border-primary hover:bg-accent/50"
      >
        {preview ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={preview} alt="Leaf preview" className="mx-auto max-h-80 rounded-xl object-contain" />
        ) : (
          <>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground"><Upload className="h-6 w-6" /></span>
            <p className="mt-4 font-display text-xl">Drop a leaf photo here</p>
            <p className="text-sm text-muted-foreground mt-1">or click to browse from your device</p>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={() => inputRef.current?.click()} variant="outline" size="lg" className="rounded-full" disabled={loading}>
          <Upload /> Choose image
        </Button>
        <Button onClick={handleDiagnose} disabled={!preview || loading} variant="default" size="lg" className="rounded-full">
          <Leaf /> {loading ? "Analyzing..." : "Diagnose"}
        </Button>
      </div>

      {error && (
        <div className="mt-8 rounded-2xl bg-destructive/10 p-6 text-destructive animate-fade-up">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 rounded-2xl bg-accent p-6 animate-fade-up">
          <p className="text-xs uppercase tracking-[0.2em] text-accent-foreground/70">Diagnosis Result ({result.confidence})</p>
          <p className="mt-2 font-display text-3xl text-accent-foreground capitalize">🍃 {result.disease.replace(/_/g, ' ')}</p>
          <p className="mt-4 text-sm font-medium text-accent-foreground">Recommended Treatment:</p>
          <p className="mt-1 text-sm text-accent-foreground/80">{result.treatment}</p>
        </div>
      )}
    </FeatureShell>
  );
}
