import Link from "next/link";
import { Sprout, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center max-w-md px-6">
        <span className="grid h-14 w-14 mx-auto place-items-center rounded-full bg-primary/10 text-primary mb-6">
          <Sprout className="h-6 w-6" />
        </span>
        <h1 className="font-display text-6xl text-foreground">404</h1>
        <p className="mt-3 text-lg text-muted-foreground font-body">
          This field hasn&apos;t been sown yet.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 mt-8 text-sm font-body font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to Home
        </Link>
      </div>
    </div>
  );
}
