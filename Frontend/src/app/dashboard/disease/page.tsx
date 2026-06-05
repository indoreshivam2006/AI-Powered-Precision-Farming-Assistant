"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Upload, Leaf, Camera, ImagePlus, X, CheckCircle2,
  AlertTriangle, Shield, Loader2, Info, Sparkles, RotateCcw,
  FileImage, Zap
} from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { cn } from "@/lib/utils";

/* ── Types ───────────────────────────────────────────────────────── */
type DiagnosisResult = {
  disease: string;
  confidence: string;
  treatment: string;
};

/* ── Helpers ──────────────────────────────────────────────────────── */
function confidenceToNum(c: string) {
  return parseFloat(c.replace("%", "")) || 0;
}

function getConfidenceColor(pct: number) {
  if (pct >= 85) return { bg: "bg-emerald-500", text: "text-emerald-600", ring: "ring-emerald-500/20", label: "High Confidence" };
  if (pct >= 60) return { bg: "bg-amber-500", text: "text-amber-600", ring: "ring-amber-500/20", label: "Moderate Confidence" };
  return { bg: "bg-red-500", text: "text-red-500", ring: "ring-red-500/20", label: "Low Confidence" };
}

function getSeverity(disease: string) {
  const lower = disease.toLowerCase();
  if (lower.includes("healthy") || lower === "healthy") return { level: "Healthy", color: "text-emerald-600 bg-emerald-50 border-emerald-200/60", icon: CheckCircle2 };
  if (lower.includes("blight") || lower.includes("rot") || lower.includes("wilt")) return { level: "Severe", color: "text-red-600 bg-red-50 border-red-200/60", icon: AlertTriangle };
  return { level: "Moderate", color: "text-amber-600 bg-amber-50 border-amber-200/60", icon: Shield };
}

/* ── Steps config ────────────────────────────────────────────────── */
const STEPS = [
  { num: 1, label: "Upload", description: "Select a leaf image" },
  { num: 2, label: "Analyze", description: "AI examines the leaf" },
  { num: 3, label: "Results", description: "Get diagnosis & treatment" },
];

/* ── Main Component ──────────────────────────────────────────────── */
export default function PlantDiseasePage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Current step
  const currentStep = result ? 3 : loading ? 2 : 1;

  const onFile = useCallback((f: File | undefined) => {
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    setFileName(f.name);
    setResult(null);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => setBase64Image(reader.result as string);
    reader.readAsDataURL(f);
  }, []);

  const handleDiagnose = async () => {
    if (!base64Image) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/backend/disease/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });

      if (!res.ok) throw new Error("Failed to reach prediction server");
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Model server is offline. Please ensure the disease prediction backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPreview(null);
    setFileName(null);
    setBase64Image(null);
    setResult(null);
    setError(null);
  };

  const confNum = result ? confidenceToNum(result.confidence) : 0;
  const confStyle = result ? getConfidenceColor(confNum) : null;
  const severity = result ? getSeverity(result.disease) : null;

  return (
    <div className="space-y-6">

      {/* ── Step Indicator ──────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-0 py-2">
        {STEPS.map((step, i) => (
          <div key={step.num} className="flex items-center">
            <div className="flex items-center gap-2.5">
              <span className={cn(
                "grid h-9 w-9 place-items-center rounded-full text-sm font-body font-bold transition-all duration-500",
                currentStep >= step.num
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "bg-muted text-muted-foreground"
              )}>
                {currentStep > step.num ? (
                  <CheckCircle2 className="h-4.5 w-4.5" />
                ) : (
                  step.num
                )}
              </span>
              <div className="hidden sm:block">
                <p className={cn(
                  "text-xs font-body font-semibold transition-colors duration-300",
                  currentStep >= step.num ? "text-foreground" : "text-muted-foreground"
                )}>{step.label}</p>
                <p className="text-[10px] font-body text-muted-foreground">{step.description}</p>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                "mx-3 sm:mx-5 h-px w-10 sm:w-16 transition-colors duration-500",
                currentStep > step.num ? "bg-primary" : "bg-border"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* ── Main Content Area ──────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-5">

        {/* Left Column — Upload & Preview */}
        <div className="lg:col-span-3 space-y-4">

          {/* Upload Zone */}
          <div
            onClick={() => !preview && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); onFile(e.dataTransfer.files?.[0]); }}
            className={cn(
              "relative rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden",
              preview
                ? "border-primary/30 bg-card cursor-default"
                : isDragOver
                  ? "border-primary bg-primary/5 scale-[1.01] cursor-pointer"
                  : "border-border hover:border-primary/50 hover:bg-accent/30 bg-background cursor-pointer",
              "min-h-[320px] flex items-center justify-center"
            )}
          >
            {preview ? (
              <div className="relative w-full p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Leaf preview"
                  className="mx-auto max-h-[360px] rounded-xl object-contain shadow-soft"
                />
                {/* File info bar */}
                <div className="mt-3 flex items-center justify-between px-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileImage className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs font-body text-muted-foreground truncate">{fileName}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleReset(); }}
                    className="flex items-center gap-1.5 text-xs font-body font-medium text-muted-foreground hover:text-destructive transition-colors rounded-full px-2.5 py-1 hover:bg-destructive/10"
                  >
                    <X className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center px-6 py-10">
                <div className={cn(
                  "mx-auto grid h-16 w-16 place-items-center rounded-2xl transition-all duration-300",
                  isDragOver ? "bg-primary text-primary-foreground scale-110" : "bg-primary/10 text-primary"
                )}>
                  <Upload className="h-7 w-7" />
                </div>
                <p className="mt-5 font-display text-xl text-foreground">
                  Drop a leaf photo here
                </p>
                <p className="text-sm text-muted-foreground mt-1.5 font-body">
                  or click to browse from your device
                </p>
                <div className="mt-5 flex items-center justify-center gap-4 text-[11px] font-body text-muted-foreground/70">
                  <span className="flex items-center gap-1"><FileImage className="h-3 w-3" /> JPG, PNG, WebP</span>
                  <span className="h-3 w-px bg-border" />
                  <span>Max 10 MB</span>
                </div>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => inputRef.current?.click()}
              variant="outline"
              size="lg"
              className="rounded-full font-body gap-2"
              disabled={loading}
            >
              <ImagePlus className="h-4 w-4" />
              {preview ? "Change image" : "Choose image"}
            </Button>
            <Button
              onClick={handleDiagnose}
              disabled={!preview || loading}
              variant="default"
              size="lg"
              className="rounded-full font-body gap-2 min-w-[160px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Diagnose Disease
                </>
              )}
            </Button>
            {result && (
              <Button
                onClick={handleReset}
                variant="ghost"
                size="lg"
                className="rounded-full font-body gap-2 text-muted-foreground"
              >
                <RotateCcw className="h-4 w-4" />
                Start over
              </Button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-2xl bg-destructive/8 border border-destructive/15 p-5 flex items-start gap-3 animate-slide-up">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-body font-medium text-destructive">{error}</p>
                <p className="text-xs font-body text-destructive/70 mt-1">
                  Run: <code className="bg-destructive/10 px-1.5 py-0.5 rounded text-xs">cd Backend/Disease prediction && python main.py</code>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column — Info & Results */}
        <div className="lg:col-span-2 space-y-4">

          {/* About card */}
          <div className="rounded-2xl bg-gradient-card p-6 shadow-soft border border-border/60">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <Leaf className="h-4 w-4" />
              </span>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-body font-semibold">About this tool</p>
            </div>
            <p className="font-display italic text-lg leading-snug text-balance text-foreground/90">
              Upload a clear photo of an affected leaf. We&apos;ll diagnose the disease and suggest a treatment plan.
            </p>
          </div>

          {/* Analysis loading state */}
          {loading && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 animate-slide-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="absolute inset-0 grid place-items-center">
                    <Leaf className="h-3.5 w-3.5 text-primary" />
                  </span>
                </div>
                <div>
                  <p className="font-display text-lg text-foreground">Analyzing leaf…</p>
                  <p className="text-xs font-body text-muted-foreground">AI is examining patterns and symptoms</p>
                </div>
              </div>
              <div className="space-y-2.5">
                {["Preprocessing image", "Running disease classifier", "Generating treatment plan"].map((step, i) => (
                  <div key={step} className="flex items-center gap-2.5 text-sm font-body text-muted-foreground" style={{ animationDelay: `${i * 300}ms` }}>
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: `${i * 400}ms` }} />
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Result Card */}
          {result && (
            <div className="rounded-2xl border border-border/60 bg-card shadow-soft overflow-hidden animate-slide-up">

              {/* Header with confidence gauge */}
              <div className="p-6 border-b border-border/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-body font-semibold">Diagnosis</p>
                    <p className="mt-1.5 font-display text-2xl text-foreground capitalize leading-tight">
                      {result.disease.replace(/_/g, " ")}
                    </p>
                  </div>
                  {/* Confidence circle */}
                  <div className={cn("relative shrink-0 grid h-16 w-16 place-items-center rounded-full ring-4", confStyle?.ring)}>
                    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/40" />
                      <circle
                        cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4"
                        strokeDasharray={`${confNum * 1.76} 176`}
                        strokeLinecap="round"
                        className={confStyle?.text}
                        style={{ transition: "stroke-dasharray 1s ease-out" }}
                      />
                    </svg>
                    <span className={cn("text-sm font-body font-bold z-10", confStyle?.text)}>
                      {Math.round(confNum)}%
                    </span>
                  </div>
                </div>

                {/* Severity & Confidence badges */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {severity && (
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-body font-semibold border", severity.color)}>
                      <severity.icon className="h-3 w-3" />
                      {severity.level}
                    </span>
                  )}
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-body font-semibold border bg-muted/40 text-muted-foreground border-border/60")}>
                    <Zap className="h-3 w-3" />
                    {confStyle?.label}
                  </span>
                </div>
              </div>

              {/* Treatment section */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-primary" />
                  <p className="text-[11px] uppercase tracking-[0.2em] font-body font-semibold text-muted-foreground">
                    Recommended Treatment
                  </p>
                </div>
                <div className="text-sm font-body text-foreground/85 leading-relaxed">
                  <MarkdownRenderer text={result.treatment} />
                </div>
              </div>
            </div>
          )}

          {/* Tips card — show when no result */}
          {!result && !loading && (
            <div className="rounded-2xl bg-muted/40 border border-border/40 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-secondary" />
                <p className="text-[11px] uppercase tracking-[0.2em] font-body font-semibold text-muted-foreground">
                  Tips for best results
                </p>
              </div>
              <ul className="space-y-2.5">
                {[
                  { icon: Camera, tip: "Use natural daylight — avoid flash" },
                  { icon: Leaf, tip: "Capture a single leaf, filling the frame" },
                  { icon: ImagePlus, tip: "Show both the front and discolored areas" },
                  { icon: Zap, tip: "Supported: 38 crop diseases across 14 species" },
                ].map((item) => (
                  <li key={item.tip} className="flex items-start gap-2.5 text-sm font-body text-muted-foreground">
                    <item.icon className="h-4 w-4 text-primary/60 shrink-0 mt-0.5" />
                    {item.tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
