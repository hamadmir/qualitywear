import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, BadgeCheck, Banknote, Shirt, Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/shop-data";
import RichText from "@/components/shop/RichText";
import PageHero from "@/components/ui/PageHero";
import Reveal from "@/components/ui/Reveal";
import Eyebrow from "@/components/ui/Eyebrow";

export const metadata: Metadata = { title: "About Us" };

const DEFAULT_ABOUT = `Quality Wear is a menswear store built on a simple idea: clothes should feel good, look sharp and last for years, without costing a fortune.

We hand-pick every piece we sell, from everyday shirts and polos to jeans and jackets. Each item is checked for fabric and stitching before it reaches our shelves, so what arrives at your door is something we would happily wear ourselves.

Order online from anywhere in Pakistan and chat with us directly about your order. Or visit our store, try things on, and talk to us in person.`;

const VALUES = [
  { icon: Shirt, title: "Premium fabrics", text: "Every piece is checked for fabric and stitching." },
  { icon: Banknote, title: "Simple payment", text: "Bank transfer, JazzCash or Easypaisa, confirmed in your order chat." },
  { icon: Truck, title: "Nationwide shipping", text: "To every city, usually in 3–5 days." },
  { icon: BadgeCheck, title: "Easy exchanges", text: "Wrong size? We'll help you swap it." },
];

export default async function AboutPage() {
  const settings = await getSettings();
  const supabase = await createClient();
  const { data: media } = await supabase
    .from("store_media")
    .select("url")
    .eq("media_type", "image")
    .order("sort_order")
    .limit(2);
  const photos = (media ?? []).map((m) => m.url as string);

  return (
    <div className="px-3 sm:px-5">
      <PageHero
        eyebrow="About us"
        title="Menswear made"
        accent="with care."
        subtitle={`${settings.shop_name}: quality you can see, prices that make sense.`}
        image={settings.hero_image_url || photos[0]}
      />

      <section className="mx-auto grid max-w-7xl gap-10 pt-20 lg:grid-cols-[1fr_1.2fr]">
        <Reveal>
          <Eyebrow>Our story</Eyebrow>
          <h2 className="mt-4 font-display text-4xl font-bold leading-[1.05] sm:text-5xl">
            Simple idea. <span className="font-accent text-neutral-400">Done properly.</span>
          </h2>
          {photos[1] && (
            <div className="mt-8 hidden aspect-[4/3] overflow-hidden rounded-[24px] lg:block">
              <img src={photos[1]} alt="Inside Quality Wear" className="h-full w-full object-cover" />
            </div>
          )}
        </Reveal>
        <Reveal delay={120} className="rounded-[28px] bg-white p-6 sm:p-10">
          <RichText text={settings.about_text?.trim() || DEFAULT_ABOUT} />
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl pt-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v, i) => (
            <Reveal key={v.title} delay={i * 100} className="rounded-[24px] border border-black/5 bg-white p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-amber">
                <v.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-6 text-lg font-bold tracking-tight">{v.title}</h3>
              <p className="mt-2 text-sm text-neutral-600">{v.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl pt-20">
        <Reveal className="relative overflow-hidden rounded-[28px] bg-amber px-6 py-14 sm:px-12">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/25 blur-2xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <h2 className="max-w-xl font-display text-4xl font-bold leading-[1.05] sm:text-5xl">
              Come and see us <span className="font-accent">in person.</span>
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/store" className="inline-flex items-center gap-3 rounded-full bg-ink py-2 pl-6 pr-2 font-semibold text-white">
                Visit our store
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber text-ink">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </Link>
              <Link href="/contact" className="inline-flex items-center rounded-full border border-ink/20 bg-white/40 px-6 py-3 font-semibold">
                Contact us
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
