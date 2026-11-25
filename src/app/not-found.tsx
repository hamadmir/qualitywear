import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4">
      <div className="animate-fade-up text-center">
        <p className="font-accent text-[120px] leading-none text-amber">404</p>
        <h1 className="mt-2 font-display text-4xl font-bold">This page doesn&apos;t exist.</h1>
        <p className="mt-3 text-neutral-600">It may have moved, or the link may be wrong.</p>
        <Link href="/" className="mt-8 inline-flex items-center gap-3 rounded-full bg-ink py-2 pl-6 pr-2 font-semibold text-white">
          Back to home
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber text-ink">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </Link>
      </div>
    </div>
  );
}
