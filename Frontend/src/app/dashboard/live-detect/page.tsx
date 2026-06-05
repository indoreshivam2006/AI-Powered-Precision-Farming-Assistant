"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Video, VideoOff, Loader2, Activity, Zap, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeatureShell } from "@/components/FeatureShell";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

/* ── Types ──────────────────────────────────────────────────────────── */

type DetectionResult = {
  label: string;
  confidence: number;
  treatment: string;
  healthy: boolean;
};

/* ── Constants ──────────────────────────────────────────────────────── */

const BACKEND_URL = "/api/backend/disease";
const FRAME_INTERVAL = 3; // send every 3rd frame

/* ── Page Component ─────────────────────────────────────────────────── */

export default function LiveDetectPage() {
  /* State */
  const [isStreaming, setIsStreaming] = useState(false);
  const [modelReady, setModelReady] = useState<boolean | null>(null); // null = checking
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /* Refs */
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const frameCountRef = useRef(0);
  const fpsTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const fpsCountRef = useRef(0);
  const isProcessingRef = useRef(false);

  /* ── Check model status on mount ─────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/model-status`);
        const data = await res.json();
        setModelReady(data.loaded);
      } catch {
        setModelReady(false);
      }
    })();
  }, []);

  /* ── FPS counter ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (isStreaming) {
      fpsCountRef.current = 0;
      fpsTimerRef.current = setInterval(() => {
        setFps(fpsCountRef.current);
        fpsCountRef.current = 0;
      }, 1000);
    } else {
      clearInterval(fpsTimerRef.current);
      setFps(0);
    }
    return () => clearInterval(fpsTimerRef.current);
  }, [isStreaming]);

  /* ── Send frame to backend ───────────────────────────────────────── */
  const sendFrame = useCallback(async () => {
    if (!canvasRef.current || !videoRef.current || isProcessingRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);

    isProcessingRef.current = true;
    try {
      const res = await fetch(`${BACKEND_URL}/detect-live`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frame: dataUrl }),
      });

      if (res.ok) {
        const data: DetectionResult = await res.json();
        setResult(data);
        fpsCountRef.current++;
      }
    } catch {
      // Silently handle - we'll keep trying
    } finally {
      isProcessingRef.current = false;
    }
  }, []);

  /* ── Capture loop ────────────────────────────────────────────────── */
  const captureLoop = useCallback(() => {
    frameCountRef.current++;
    if (frameCountRef.current % FRAME_INTERVAL === 0) {
      sendFrame();
    }
    animFrameRef.current = requestAnimationFrame(captureLoop);
  }, [sendFrame]);

  /* ── Start / Stop ────────────────────────────────────────────────── */
  const startStream = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsStreaming(true);
      frameCountRef.current = 0;
      animFrameRef.current = requestAnimationFrame(captureLoop);
    } catch (err: unknown) {
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError") {
          setError("Camera access was denied. Please allow camera permissions in your browser settings and reload the page.");
        } else if (err.name === "NotFoundError") {
          setError("No camera found on this device. Please connect a camera and try again.");
        } else {
          setError(`Camera error: ${err.message}`);
        }
      } else {
        setError("An unexpected error occurred while accessing the camera.");
      }
    }
  };

  const stopStream = () => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStreaming(false);
    setResult(null);
    isProcessingRef.current = false;
  };

  /* ── Cleanup on unmount ──────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      clearInterval(fpsTimerRef.current);
    };
  }, []);

  /* ── Confidence color ────────────────────────────────────────────── */
  const confPct = result ? Math.round(result.confidence * 100) : 0;
  const confColor =
    confPct >= 85 ? "#22c55e" : confPct >= 60 ? "#f59e0b" : "#ef4444";
  const borderColor =
    confPct >= 85 ? "border-green-500" : confPct >= 60 ? "border-orange-400" : "border-red-500";

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <FeatureShell intro="Point your camera at a plant leaf for real-time AI disease detection. Results update live as you move.">
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Model loading state */}
      {modelReady === null && (
        <div className="flex items-center justify-center gap-3 rounded-2xl bg-accent p-6 mb-6 animate-pulse">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm font-body font-medium">Warming up AI model…</p>
        </div>
      )}

      {modelReady === false && (
        <div className="flex items-center gap-3 rounded-2xl bg-destructive/10 p-6 mb-6 border border-destructive/20">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-body font-medium text-destructive">Disease prediction server is offline</p>
            <p className="text-xs text-muted-foreground mt-1 font-body">
              Start the backend: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">cd Backend/Disease prediction &amp;&amp; python main.py</code>
            </p>
          </div>
        </div>
      )}

      {/* Camera permission error */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl bg-destructive/10 p-6 mb-6 border border-destructive/20 animate-fade-up">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive font-body">{error}</p>
        </div>
      )}

      {/* Video container */}
      <div className="relative mx-auto w-full max-w-2xl">
        <div
          className={`relative overflow-hidden rounded-2xl border-[3px] transition-all duration-500 ${
            isStreaming && result
              ? borderColor
              : "border-border"
          } bg-[#0a0a0a]`}
          style={{ aspectRatio: "4/3" }}
        >
          {/* Video element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              isStreaming ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Idle state */}
          {!isStreaming && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-primary/10 backdrop-blur">
                <Video className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground text-sm font-body">Click start to begin live detection</p>
            </div>
          )}

          {/* ── Overlay: Label & Confidence ─────────────────────────── */}
          {isStreaming && result && (
            <>
              {/* Top-left: Label */}
              <div className="absolute top-4 left-4 right-4 pointer-events-none">
                <div className="inline-flex items-center gap-2 rounded-xl bg-black/70 backdrop-blur-md px-4 py-2.5 shadow-lg">
                  <span
                    className="h-3 w-3 rounded-full shrink-0 animate-pulse"
                    style={{ backgroundColor: confColor }}
                  />
                  <span className="font-display text-lg md:text-xl text-white leading-tight truncate">
                    {result.label}
                  </span>
                </div>
              </div>

              {/* Top-right: Confidence */}
              <div className="absolute top-4 right-4 pointer-events-none">
                <div className="rounded-xl bg-black/70 backdrop-blur-md px-4 py-2.5 shadow-lg text-right">
                  <p className="text-[10px] uppercase tracking-wider text-white/55 font-body">Confidence</p>
                  <p className="font-display text-2xl md:text-3xl text-white leading-none mt-0.5" style={{ color: confColor }}>
                    {confPct}%
                  </p>
                  {/* Mini progress bar */}
                  <div className="mt-1.5 h-1.5 w-24 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${confPct}%`, backgroundColor: confColor }}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom-left: Treatment */}
              <div className="absolute bottom-4 left-4 right-16 pointer-events-none">
                <div className="rounded-xl bg-black/70 backdrop-blur-md px-4 py-2.5 shadow-lg">
                  <p className="text-[10px] uppercase tracking-wider text-white/45 flex items-center gap-1.5 font-body">
                    <Shield className="h-3 w-3" /> Treatment
                  </p>
                  <p className="text-xs text-white/90 mt-1 leading-relaxed line-clamp-2">
                    {result.treatment}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Bottom-right: FPS */}
          {isStreaming && (
            <div className="absolute bottom-4 right-4 pointer-events-none">
              <div className="rounded-lg bg-black/70 backdrop-blur-md px-3 py-1.5 shadow-lg flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-yellow-400" />
                <span className="text-xs font-mono text-white/75">{fps} FPS</span>
              </div>
            </div>
          )}

          {/* Scanning animation overlay */}
          {isStreaming && !result && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-2 rounded-xl bg-black/70 backdrop-blur-md px-4 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-white/75 font-body">Scanning…</span>
              </div>
            </div>
          )}
        </div>

        {/* Health indicator badge */}
        {isStreaming && result && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold shadow-lg transition-all duration-500 ${
                result.healthy
                  ? "bg-green-500/90 text-white"
                  : "bg-red-500/90 text-white"
              }`}
            >
              <Activity className="h-3 w-3" />
              {result.healthy ? "HEALTHY" : "DISEASE DETECTED"}
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        {!isStreaming ? (
          <Button
            onClick={startStream}
            disabled={modelReady === false || modelReady === null}
            size="lg"
            className="rounded-full px-8 gap-2 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Video className="h-5 w-5" />
            Start Live Detection
          </Button>
        ) : (
          <Button
            onClick={stopStream}
            variant="destructive"
            size="lg"
            className="rounded-full px-8 gap-2 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <VideoOff className="h-5 w-5" />
            Stop Camera
          </Button>
        )}
      </div>

      {/* Live result detail card (below video) */}
      {result && isStreaming && (
        <div className="mt-6 mx-auto max-w-2xl rounded-2xl bg-card border border-border p-6 shadow-soft animate-fade-up">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-body font-semibold">Live Detection Result</p>
              <p className="mt-1 font-display text-2xl truncate">{result.label}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display text-3xl" style={{ color: confColor }}>
                {confPct}%
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">confidence</p>
            </div>
          </div>
          {/* Full-width progress bar */}
          <div className="mt-4 h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${confPct}%`, backgroundColor: confColor }}
            />
          </div>
          <div className="mt-4 text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Treatment: </span>
            <div className="mt-1">
              <MarkdownRenderer text={result.treatment} />
            </div>
          </div>
        </div>
      )}
    </FeatureShell>
  );
}
