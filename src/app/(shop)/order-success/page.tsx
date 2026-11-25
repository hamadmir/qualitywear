import Link from "next/link";
import { ArrowUpRight, Check, PackageCheck, Phone, Truck } from "lucide-react";
import { getSettings } from "@/lib/shop-data";
import { whatsappLink } from "@/lib/format";
import { WhatsAppIcon } from "@/components/shop/WhatsAppButton";

export const metadata = { title: "Order placed" };

export default async function OrderSuccessPage({ searchParams }: { searchParams: Promise<{ no?: string }> }) {
  const { no } = await searchParams;
  const settings = await getSettings();
  const wa = whatsappLink(settings.whatsapp_number, `Hi Quality Wear! I just placed order ${no ?? ""}.`);

  return (
    <div className="px-3 pt-6 sm:px-5">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-[28px] bg-ink text-white">
        <div className="relative px-6 py-16 text-center sm:px-12">
          <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-amber/25 blur-3xl" />
          <span className="animate-fade-up relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber text-ink">
            <Check className="h-10 w-10" strokeWidth={3} />
          </span>
          <h1 className="animate-fade-up delay-100 relative mt-8 font-display text-5xl font-bold">
            Thank you. <span className="font-accent text-amber">Order placed.</span>
          </h1>
          <p className="animate-fade-up delay-200 relative mx-auto mt-4 max-w-md text-white/70">
            We&apos;ve received your order and will contact you shortly to confirm it.
          </p>
          {no && (
            <div className="animate-fade-up delay-300 relative mx-auto mt-8 inline-block rounded-2xl border border-white/15 bg-white/5 px-8 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Order number</p>
              <p className="mt-1 font-mono text-3xl font-bold tracking-wider">{no}</p>
            </div>
          )}
        </div>
        <div className="grid border-t border-white/10 sm:grid-cols-3">
          {[
            { icon: Phone, t: "We call to confirm", d: "Usually the same day" },
            { icon: Truck, t: "We ship it", d: "3–5 working days" },
            { icon: PackageCheck, t: "You pay on delivery", d: "Cash to the rider" },
          ].map((s, i) => (
            <div key={s.t} className={`p-6 ${i > 0 ? "border-t border-white/10 sm:border-l sm:border-t-0" : ""}`}>
              <s.icon className="h-5 w-5 text-amber" />
              <p className="mt-3 font-semibold">{s.t}</p>
              <p className="text-sm text-white/50">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-3">
        <Link href="/track" className="btn-outline rounded-full px-6">Track your order</Link>
        <Link href="/shop" className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-white">
          Continue shopping <ArrowUpRight className="h-4 w-4" />
        </Link>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-2.5 text-sm font-semibold text-white">
            <WhatsAppIcon className="h-4 w-4" /> Confirm on WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
