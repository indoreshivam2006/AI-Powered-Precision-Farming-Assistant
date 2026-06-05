"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sprout, CloudSun, LineChart, Bot, ArrowRight, Leaf, Sparkles, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Sprout, title: "Crop Recommendation", text: "Soil + climate aware suggestions for the highest-yielding crop on your land." },
  { icon: Leaf, title: "Plant Disease Predict", text: "Snap a leaf. Get an instant diagnosis and treatment plan powered by deep learning." },
  { icon: LineChart, title: "Fertilizer Optimizer", text: "Right nutrient, right dose, right time — calculated from ICAR standards." },
  { icon: Bot, title: "AI Advisory Agent", text: "A 24/7 farming companion that speaks your language — Hindi, Marathi, Tamil & more." },
];

const stats = [
  { value: "24/7", label: "AI Advisory" },
  { value: "1000+", label: "Mandis Tracked" },
  { value: "38", label: "Diseases Detected" },
  { value: "12", label: "Indian Languages" },
];

export default function LandingPage() {
  const navRef = useRef<HTMLElement>(null);
  const [heroH, setHeroH] = useState(0);

  useEffect(() => {
    const update = () => {
      const nh = navRef.current?.getBoundingClientRect().height ?? 57;
      setHeroH(window.innerHeight - nh - 20);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="min-h-screen bg-background">

      {/* ─── Navbar ─── */}
      <header ref={navRef} className="sticky top-0 z-50 bg-background/90 glass border-b border-border/30">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 md:px-8 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Sprout className="h-5 w-5 text-primary-deep" />
            <span className="font-display text-xl text-primary-deep tracking-tight">Kisan</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-body font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#about" className="hover:text-foreground transition-colors">About</a>
          </nav>

          <div className="flex items-center gap-3">
            <button className="md:hidden grid h-9 w-9 place-items-center rounded-lg hover:bg-muted transition-colors">
              <Menu className="h-5 w-5 text-foreground" />
            </button>
            <Link href="/dashboard" onClick={() => localStorage.setItem("kisan_session", "active")}>
              <Button className="rounded-full bg-primary-glow text-white hover:bg-primary-glow/90 font-body text-sm font-medium px-5 shadow-soft">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero — Inset Image with Overlaid Text ─── */}
      <section className="px-3 sm:px-4 md:px-6 py-2">
        <div
          className="relative mx-auto max-w-[1440px] overflow-hidden rounded-[1.25rem] md:rounded-[1.75rem]"
          style={{ height: heroH > 0 ? heroH : "calc(100vh - 80px)" }}
        >
          <Image
            src="/hero-farm.jpg"
            alt="Lush green terraced farmland at golden hour"
            className="absolute inset-0 h-full w-full object-cover"
            width={1920}
            height={1080}
            priority
          />

          {/* Gradient overlay — dark at edges for text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/15 to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

          {/* Top-left: Primary headline */}
          <div className="absolute top-8 left-8 md:top-12 md:left-12 lg:top-16 lg:left-16 max-w-lg xl:max-w-xl">
            <h1 className="font-display text-[clamp(2rem,5.5vw,5.5rem)] leading-[0.95] text-white">
              Smart farming<br />
              for every field
            </h1>
          </div>

          {/* Bottom-right: Secondary text + CTA */}
          <div className="absolute bottom-6 right-6 md:bottom-8 md:right-10 lg:bottom-10 lg:right-14 max-w-sm md:max-w-md text-right">
            <p className="font-display text-[clamp(1.15rem,2.8vw,2.5rem)] leading-[1.1] text-white/95">
              Be part of the agri revolution and grow with AI intelligence
            </p>
            <Link href="/dashboard" onClick={() => localStorage.setItem("kisan_session", "active")} className="mt-5 inline-block">
              <Button className="rounded-full bg-primary-glow text-white hover:bg-primary-glow/85 font-body text-sm md:text-base font-medium px-6 md:px-8 py-2.5 md:py-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
                Explore dashboard
              </Button>
            </Link>
          </div>

          {/* Bottom-left: Badge */}
          <div className="absolute bottom-6 left-6 md:bottom-8 md:left-10 lg:bottom-10 lg:left-14 hidden md:block">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-white/80 font-body font-medium">
              <Sparkles className="h-3 w-3" />
              For the Indian farmer
            </span>
          </div>
        </div>
      </section>

      {/* ─── Stat Strip ─── */}
      <section className="mx-auto max-w-[1440px] px-5 md:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 py-8 md:py-12">
          {stats.map(s => (
            <div key={s.label} className="text-center md:text-left">
              <p className="font-display text-3xl md:text-4xl text-foreground">{s.value}</p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mt-1 font-body font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section id="features" className="mx-auto max-w-[1440px] px-5 md:px-8 py-12 md:py-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <p className="font-body text-[11px] uppercase tracking-[0.25em] text-secondary font-semibold">What we offer</p>
            <h2 className="mt-3 font-display text-display-lg text-foreground text-balance max-w-xl">
              Everything your farm needs, in one place.
            </h2>
          </div>
          <Link href="/dashboard" onClick={() => localStorage.setItem("kisan_session", "active")}>
            <Button variant="outline" className="rounded-full font-body font-medium gap-2 px-6">
              View all tools <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <article
              key={f.title}
              className="group rounded-2xl bg-card p-6 md:p-7 shadow-soft border border-border/50 transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 flex flex-col"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 font-display text-xl text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed font-body flex-1">{f.text}</p>
              <div className="mt-5 pt-4 border-t border-border/40">
                <Link
                  href="/dashboard"
                  onClick={() => localStorage.setItem("kisan_session", "active")}
                  className="text-xs font-body font-semibold text-primary hover:text-primary-deep inline-flex items-center gap-1 transition-colors"
                >
                  Try it now <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ─── About / Mission — Full-width Image Card ─── */}
      <section id="about" className="px-3 sm:px-5 md:px-8 py-8 md:py-12">
        <div className="relative mx-auto max-w-[1440px] overflow-hidden rounded-[1.5rem] md:rounded-[2rem] bg-primary-deep min-h-[420px] md:min-h-[500px] flex items-center">
          <div className="absolute inset-0 bg-grain opacity-20" />

          {/* Decorative elements */}
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary-glow/15 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-secondary/15 blur-3xl" />

          <div className="relative grid md:grid-cols-2 gap-10 md:gap-16 p-8 md:p-14 lg:p-20 w-full">
            <div>
              <p className="font-body text-[11px] uppercase tracking-[0.25em] text-white/50 font-semibold">Our mission</p>
              <h2 className="mt-4 font-display text-display-lg text-white leading-tight">
                The fields are waiting.
              </h2>
              <p className="mt-5 text-base md:text-lg text-white/70 font-body leading-relaxed max-w-md">
                Weather, mandi prices, and an AI agronomist — woven into one calm place, so every decision on your farm is an informed one.
              </p>
              <Link href="/dashboard" className="mt-8 inline-block" onClick={() => localStorage.setItem("kisan_session", "active")}>
                <Button className="rounded-full bg-white text-primary-deep hover:bg-white/90 font-body font-semibold px-8 py-3 shadow-elevated hover:-translate-y-0.5 transition-all duration-300 gap-2">
                  Open dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="flex flex-col justify-center gap-6">
              {[
                { icon: CloudSun, title: "Live Weather", desc: "Hyperlocal forecasts tailored to your GPS location" },
                { icon: LineChart, title: "Mandi Prices", desc: "Real-time prices from 1000+ mandis across India" },
                { icon: Bot, title: "AI Agronomist", desc: "Ask anything in Hindi, Marathi, Tamil — 24/7" },
              ].map(item => (
                <div key={item.title} className="flex items-start gap-4 group">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white/80 group-hover:bg-white/15 transition-colors">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-display text-lg text-white">{item.title}</p>
                    <p className="text-sm text-white/55 font-body mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="mx-auto max-w-[1440px] px-5 md:px-8 border-t border-border">
        <div className="flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2.5">
            <Sprout className="h-4 w-4 text-primary" />
            <p className="font-body">© 2026 Kisan Digital. Built for India&apos;s growers.</p>
          </div>
          <p className="font-display italic text-foreground/50">Cultivating clarity, one field at a time.</p>
        </div>
      </footer>
    </div>
  );
}
