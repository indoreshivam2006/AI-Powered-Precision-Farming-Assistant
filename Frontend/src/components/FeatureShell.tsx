import { ReactNode } from "react";

export function FeatureShell({ intro, children }: { intro: string; children: ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <aside className="lg:col-span-1 rounded-3xl bg-gradient-card p-7 shadow-soft border border-border h-fit">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">About this tool</p>
        <p className="mt-3 font-display italic text-xl leading-snug text-balance">{intro}</p>
      </aside>
      <section className="lg:col-span-2 rounded-3xl bg-card p-7 md:p-9 shadow-soft border border-border">
        {children}
      </section>
    </div>
  );
}
