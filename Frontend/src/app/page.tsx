import Link from "next/link";
import Image from "next/image";
import { Sprout, CloudSun, LineChart, Bot, ArrowRight, Leaf, Sparkles, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Sprout, title: "Crop Recommendation", text: "Soil + climate aware suggestions for the highest-yielding crop on your land." },
  { icon: Leaf, title: "Plant Disease Predict", text: "Snap a leaf. Get an instant diagnosis and treatment plan." },
  { icon: LineChart, title: "Fertilizer Optimizer", text: "Right nutrient, right dose, right time — without overspending." },
  { icon: Bot, title: "AI Advisory Agent", text: "A 24/7 farming companion that speaks your language." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="absolute top-0 left-0 right-0 z-20">
        <div className="container flex items-center justify-between py-6">
          <Link href="/" className="flex items-center gap-2 text-background">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-background/15 backdrop-blur">
              <Sprout className="h-5 w-5" />
            </span>
            <span className="font-display text-xl">Kisan</span>
          </Link>
          <Link href="/dashboard">
            <Button variant="hero" size="sm" className="rounded-full">Sign in with Google</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-[100vh] overflow-hidden">
        <Image
          src="/hero-farm.jpg"
          alt="Terraced farmland at golden hour"
          className="absolute inset-0 h-full w-full object-cover scale-105"
          width={1600}
          height={1024}
          priority
        />
        {/* Cinematic depth: dark vignette on left for text, warm glow on right */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,hsl(134_22%_10%/0.85)_0%,hsl(134_22%_15%/0.55)_45%,transparent_75%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary-deep/80 via-primary-deep/10 to-primary-deep/40" />
        <div className="absolute inset-0 bg-grain opacity-[0.15] mix-blend-overlay" />

        {/* Floating organic accent */}
        <div className="absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-primary-glow/20 blur-3xl animate-float" />
        <div className="absolute left-1/3 -bottom-32 h-80 w-80 rounded-full bg-secondary/30 blur-3xl" />

        <div className="relative container flex min-h-[100vh] flex-col justify-center pt-28 pb-24">
          <div className="max-w-4xl animate-fade-up">
            {/* Badge */}
            <span className="inline-flex items-center gap-2.5 rounded-full border border-background/25 bg-background/[0.08] px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-background/95 backdrop-blur-md shadow-soft">
              <Sparkles className="h-3 w-3" />
              For the Indian farmer
              <span className="h-3 w-px bg-background/30" />
              <span className="inline-flex items-center gap-1 text-background/70 normal-case tracking-normal">
                <MapPin className="h-3 w-3" /> Bharat
              </span>
            </span>

            {/* Headline */}
            <h1 className="mt-8 font-display font-medium leading-[0.95] text-background text-balance text-[clamp(3rem,9vw,8.5rem)]">
              Grow{" "}
              <span className="relative inline-block">
                smarter
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-primary-glow/80" viewBox="0 0 200 12" preserveAspectRatio="none" fill="none">
                  <path d="M2 8 Q 50 2, 100 6 T 198 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              ,<br/>
              <em className="font-light text-background/95 [font-feature-settings:'ss01']">harvest better.</em>
            </h1>

            {/* Subhead with accent rule */}
            <div className="mt-8 flex items-start gap-5 max-w-2xl">
              <span className="mt-3 h-12 w-px bg-gradient-to-b from-background/60 to-transparent shrink-0" />
              <p className="text-lg md:text-xl leading-relaxed text-background/85 font-light">
                Weather, mandi prices, and an AI agronomist — woven into one calm place, so every decision on your farm is an informed one.
              </p>
            </div>

            {/* CTAs */}
            <div className="mt-12 flex flex-wrap items-center gap-4">
              <Link href="/dashboard" className="group">
                <Button variant="hero" size="xl" className="bg-background text-primary-deep hover:bg-background hover:text-primary-deep pl-2 pr-7 gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-deep text-background transition-smooth group-hover:rotate-12">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                  Sign in with Google
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" size="xl" className="border-background/30 bg-background/[0.06] text-background hover:bg-background/15 hover:text-background backdrop-blur-md">
                  Explore features
                </Button>
              </a>
            </div>

            {/* Stat strip */}
            <div className="mt-16 flex flex-wrap items-center gap-x-10 gap-y-5 border-t border-background/15 pt-8 max-w-2xl">
              {[
                { k: "24/7", v: "AI advisory" },
                { k: "1000+", v: "Mandis tracked" },
                { k: "12", v: "Indian languages" },
              ].map(s => (
                <div key={s.v}>
                  <p className="font-display text-3xl text-background">{s.k}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-background/60 mt-1">{s.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2 text-background/60 animate-float">
          <span className="text-[10px] uppercase tracking-[0.3em]">Scroll</span>
          <span className="h-10 w-px bg-gradient-to-b from-background/60 to-transparent" />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-body text-xs uppercase tracking-[0.25em] text-secondary">Everything in one field</p>
          <h2 className="mt-4 font-display text-4xl md:text-5xl text-balance">
            A quiet revolution for the people who feed us.
          </h2>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-2">
          {features.map((f, i) => (
            <article
              key={f.title}
              className="group rounded-3xl bg-gradient-card p-8 shadow-soft transition-smooth hover:shadow-elevated hover:-translate-y-1"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start gap-5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground transition-smooth group-hover:scale-110">
                  <f.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-2xl">{f.title}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed">{f.text}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section className="container pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-primary-deep px-8 py-16 text-center md:px-16 md:py-24">
          <div className="absolute inset-0 bg-grain opacity-40" />
          <div className="relative">
            <CloudSun className="mx-auto h-10 w-10 text-background/80" />
            <h2 className="mt-6 font-display text-4xl text-background md:text-5xl">
              The fields are waiting.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-background/75">
              Step into your dashboard and see today&apos;s weather, prices, and AI guidance — all in one glance.
            </p>
            <Link href="/dashboard" className="mt-8 inline-block">
              <Button variant="hero" size="xl" className="bg-background text-primary-deep hover:bg-background/90">
                Open dashboard <ArrowRight />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="container flex flex-col items-center justify-between gap-3 py-8 text-sm text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Kisan. Built for India&apos;s growers.</p>
          <p className="font-display italic">Cultivating clarity, one field at a time.</p>
        </div>
      </footer>
    </div>
  );
}
