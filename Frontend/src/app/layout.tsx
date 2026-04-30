import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kisan — Smart Farming Companion for India",
  description:
    "Kisan: weather, mandi prices, crop & fertilizer guidance, plant disease prediction, and an AI agronomist — all in one calm dashboard.",
  openGraph: {
    title: "Kisan — Smart Farming Companion for India",
    description:
      "Weather, mandi prices, and an AI agronomist — woven into one calm place for every Indian farmer.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
