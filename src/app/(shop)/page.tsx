import { SITE_URL } from "@/lib/site";
import Link from "next/link";
import {
  ArrowUpRight,
  Banknote,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  RefreshCcw,
  Shirt,
  Truck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCategories, getSettings } from "@/lib/shop-data";
import { PRODUCT_SELECT, type BlogPost, type Product } from "@/lib/types";
import { mainImage, rs, whatsappLink } from "@/lib/format";
import ProductCard from "@/components/shop/ProductCard";
import BlogCard from "@/components/shop/BlogCard";
import Reveal from "@/components/ui/Reveal";
import Eyebrow from "@/components/ui/Eyebrow";

const DEFAULT_FAQ = `How do I pay?
By bank transfer, JazzCash or Easypaisa. After you place your order, your order chat opens and we share payment details there. Send us the payment screenshot and we ship.

How long does delivery take?
Usually 3 to 5 working days, to every city in Pakistan.

What if the size doesn't fit?
Message us on WhatsApp or through the Contact page and we will help you exchange it.

How can I track my order?
You get an order number when you place your order. Enter it with your phone number on the Track Order page to see the latest status.`;

function parseFaq(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => {
      const [q, ...rest] = b.split("\n");
      return { q: q.trim(), a: rest.join("\n").trim() };
    })
    .filter((f) => f.q && f.a);
}

export const metadata = {
  title: { absolute: "Quality Wear | Men's Clothing Store in Sialkot, Pakistan" },
  description:
    "Shop men's shirts, jeans, polos, t-shirts, jackets, hoodies and sweaters at Quality Wear, Sialkot. Premium fabrics, honest prices and delivery across Pakistan.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const supabase = await createClient();
  const [categories, settings, featuredRes, latestRes, blogRes, catImgRes] = await Promise.all([
    getCategories(),
    getSettings(),
    supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("blog_posts")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(3),
    supabase
      .from("products")
      .select("category_id, product_images(image_url, sort_order)")
      .eq("is_active", true)
      .not("category_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const featured = (featuredRes.data as Product[]) ?? [];
  const latest = (latestRes.data as Product[]) ?? [];
  const posts = (blogRes.data as BlogPost[]) ?? [];
  const heroImage =
    settings.hero_image_url ||
    mainImage(featured[0] ?? latest[0] ?? ({ product_images: [] } as unknown as Product));

  // Fallback category pictures: first product photo in that category
  const catImage: Record<string, string> = {};
  for (const row of (catImgRes.data ?? []) as { category_id: string; product_images: { image_url: string; sort_order: number }[] }[]) {
    const first = [...(row.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
    if (first && !catImage[row.category_id]) catImage[row.category_id] = first.image_url;
  }

  const wa = whatsappLink(settings.whatsapp_number, "Hi Quality Wear! I'd like to place an order.");
  const mapLink =
    settings.map_link ||
    (settings.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}` : null);
  const faqs = parseFaq(settings.faq_text?.trim() || DEFAULT_FAQ);
  const city = settings.address?.split(",").pop()?.trim();
  const ticker = [...categories.map((c) => c.name), "Order Chat", "Nationwide Shipping", "Easy Exchanges", "Premium Fabrics", "New Arrivals Weekly"];

  const stats = [
    { label: "Payment", value: "Bank · JazzCash" },
    { label: "Delivery", value: "3–5 days" },
    { label: "Wrong size?", value: "Easy exchange" },
    settings.free_delivery_above != null
      ? { label: "Free delivery over", value: rs(settings.free_delivery_above) }
      : { label: "Shipping", value: "All of Pakistan" },
  ];

  const storeJsonLd = {
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    name: settings.shop_name || "Quality Wear",
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    image: settings.hero_image_url || `${SITE_URL}/icon-512.png`,
    description: "Menswear store in Sialkot selling shirts, jeans, polos, t-shirts, jackets, hoodies, sweaters and trousers, with delivery across Pakistan.",
    telephone: settings.phone || undefined,
    email: settings.email || undefined,
    priceRange: "Rs",
    address: settings.address
      ? { "@type": "PostalAddress", streetAddress: settings.address, addressLocality: "Sialkot", addressRegion: "Punjab", addressCountry: "PK" }
      : undefined,
    hasMap: settings.map_link || undefined,
    openingHours: settings.opening_hours ? "Mo-Su 11:00-23:00" : undefined,
    sameAs: [settings.instagram_url, settings.facebook_url, settings.tiktok_url].filter(Boolean),
    areaServed: { "@type": "Country", name: "Pakistan" },
  };

  return (
    <div className="px-3 sm:px-5">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd).replace(/</g, "\\u003c") }} />
      {/* ---------- HERO ---------- */}
      <section className="relative mx-auto -mt-[76px] max-w-7xl overflow-hidden rounded-[28px] bg-ink text-white">
        {heroImage && <img src={heroImage} alt="" className="animate-slow-zoom absolute inset-0 h-full w-full object-cover opacity-50" />}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/10" />
        {!heroImage && (
          <div className="absolute -right-20 top-10 h-[420px] w-[420px] rounded-full bg-amber/20 blur-3xl" />
        )}
        <div className="relative px-6 pb-8 pt-32 sm:px-12 sm:pt-40">
          <div className="animate-fade-up">
            <Eyebrow light>
              {city ? `${city}, Pakistan` : "Pakistan"} · Nationwide Delivery
            </Eyebrow>
          </div>
          <h1 className="animate-fade-up delay-100 mt-5 max-w-3xl font-display text-[44px] font-bold leading-[1.02] sm:text-7xl">
            Quality menswear,
            <br />
            <span className="font-accent text-amber">made to last.</span>
          </h1>
          <p className="animate-fade-up delay-200 mt-6 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
            Shirts, jeans, polos and jackets in premium fabrics, at honest prices. Delivered to your door, with a personal chat for every order.
          </p>
          <div className="animate-fade-up delay-300 mt-8 flex flex-wrap gap-3">
            <Link
              href="/shop"
              className="inline-flex items-center gap-3 rounded-full bg-amber py-2 pl-6 pr-2 font-semibold text-ink transition hover:brightness-95"
            >
              Shop Now
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </Link>
            <Link
              href="#collections"
              className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-6 py-3 font-semibold backdrop-blur transition hover:bg-white/20"
            >
              Explore collections
            </Link>
          </div>

          <div className="animate-fade-up delay-400 mt-16 grid grid-cols-2 gap-y-6 border-t border-white/15 pt-6 sm:mt-24 lg:grid-cols-4">
            {stats.map((s, i) => (
              <div key={s.label + i} className={`pr-4 ${i > 0 ? "lg:border-l lg:border-white/15 lg:pl-6" : ""}`}>
                <p className="text-xs text-white/60">{s.label}</p>
                <p className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- TICKER ---------- */}
      <div className="mx-auto mt-5 max-w-7xl overflow-hidden rounded-full border border-black/5 bg-white py-3.5">
        <div className="marquee-track flex w-max gap-8 whitespace-nowrap text-sm font-semibold">
          {[...ticker, ...ticker].map((t, i) => (
            <span key={i} className="flex items-center gap-8">
              {t}
              <span className="text-amber">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ---------- COLLECTIONS ---------- */}
      {categories.length > 0 && (
        <section id="collections" className="mx-auto max-w-7xl scroll-mt-28 pt-24">
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Eyebrow>Our collections</Eyebrow>
              <h2 className="mt-4 font-display text-4xl font-bold leading-[1.05] sm:text-6xl">
                For every occasion. <span className="font-accent text-neutral-400">All in one place.</span>
              </h2>
            </div>
            <Link href="/shop" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:text-brass">
              Shop the full collection <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Reveal>
          <Reveal delay={100} className="mt-10 grid auto-rows-[220px] grid-cols-1 gap-4 sm:auto-rows-[260px] sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c, i) => {
              const img = c.image_url || catImage[c.id];
              const big = i === 0 && categories.length > 2;
              const wide = categories.length > 2 && (categories.length - 1) % 2 === 1 && i === categories.length - 1;
              return (
                <Link
                  key={c.id}
                  href={`/shop?category=${c.slug}`}
                  className={`group relative overflow-hidden rounded-[24px] bg-ink ${big ? "sm:row-span-2" : ""} ${wide ? "lg:col-span-2" : ""}`}
                >
                  {img ? (
                    <img src={img} alt={c.name} className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-700 group-hover:scale-105 group-hover:opacity-80" />
                  ) : (
                    <span className="absolute -right-4 -top-8 select-none text-[180px] font-extrabold leading-none tracking-tighter text-white/5">
                      {c.name.charAt(0)}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <span className="absolute left-5 top-5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{c.name}</h3>
                      <p className="mt-1 text-sm text-white/70">Explore collection</p>
                    </div>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ink transition group-hover:bg-amber">
                      <ArrowUpRight className="h-5 w-5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </Reveal>
        </section>
      )}

      {/* ---------- FEATURED ---------- */}
      {featured.length > 0 && (
        <ProductSection eyebrow="Featured" title="Handpicked." accent="Just for you." products={featured} categories={[]} />
      )}

      {/* ---------- NEW ARRIVALS ---------- */}
      <ProductSection
        eyebrow="Just landed"
        title="New arrivals."
        accent="Fresh this week."
        products={latest}
        categories={categories.map((c) => ({ name: c.name, slug: c.slug }))}
      />

      {/* ---------- WHY US ---------- */}
      <section className="mx-auto max-w-7xl pt-24">
        <Reveal className="rounded-[28px] bg-white p-6 sm:p-12">
          <Eyebrow>Why Quality Wear</Eyebrow>
          <h2 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.05] sm:text-5xl">
            The reason is simple. <span className="font-accent text-neutral-400">Quality first.</span>
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Shirt, title: "Premium fabrics", text: "Every piece is checked for fabric and stitching before it reaches our shelves." },
              { icon: Banknote, title: "Order chat", text: "Talk to us directly about your order. Pay by bank, JazzCash or Easypaisa." },
              { icon: Truck, title: "Doorstep delivery", text: "We ship to every city in Pakistan, usually within 3 to 5 days." },
              { icon: RefreshCcw, title: "Easy exchanges", text: "Wrong size? Get in touch and we will help you swap it." },
            ].map((f, i) => (
              <div key={f.title} className="rounded-[20px] border border-black/5 bg-ivory p-6">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-amber">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold text-neutral-400">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-6 text-lg font-bold tracking-tight">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{f.text}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ---------- STORE ---------- */}
      {(settings.address || settings.phone) && (
        <section className="mx-auto max-w-7xl pt-24">
          <Reveal className="grid overflow-hidden rounded-[28px] bg-ink text-white md:grid-cols-2">
            <div className="p-8 sm:p-12">
              <Eyebrow light>Visit our store</Eyebrow>
              <h2 className="mt-4 font-display text-4xl font-bold leading-[1.05]">
                See it, feel it, <span className="font-accent text-amber">try it on.</span>
              </h2>
              <ul className="mt-8 space-y-4 text-sm text-white/75">
                {settings.address && (
                  <li className="flex gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                    <span className="whitespace-pre-line">{settings.address}</span>
                  </li>
                )}
                {settings.opening_hours && (
                  <li className="flex gap-3">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                    <span className="whitespace-pre-line">{settings.opening_hours}</span>
                  </li>
                )}
                {settings.phone && (
                  <li className="flex gap-3">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                    <a href={`tel:${settings.phone}`} className="hover:text-white">{settings.phone}</a>
                  </li>
                )}
              </ul>
              <div className="mt-10 flex flex-wrap gap-3">
                {mapLink && (
                  <a
                    href={mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 rounded-full bg-amber py-2 pl-5 pr-2 font-semibold text-ink"
                  >
                    Get directions
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </a>
                )}
                <Link href="/store" className="inline-flex items-center rounded-full border border-white/25 px-5 py-3 font-semibold hover:bg-white/10">
                  Take a look inside
                </Link>
              </div>
            </div>
            {settings.address && (
              <iframe
                src={`https://maps.google.com/maps?q=${encodeURIComponent(settings.address)}&output=embed`}
                title="Store location"
                className="h-80 w-full md:h-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            )}
          </Reveal>
        </section>
      )}

      {/* ---------- BLOG ---------- */}
      {posts.length > 0 && (
        <section className="mx-auto max-w-7xl pt-24">
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Eyebrow>The Journal</Eyebrow>
              <h2 className="mt-4 font-display text-4xl font-bold leading-[1.05] sm:text-5xl">
                Style notes. <span className="font-accent text-neutral-400">Worth a read.</span>
              </h2>
            </div>
            <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:text-brass">
              All articles <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p, i) => (
              <Reveal key={p.id} delay={i * 120}>
                <BlogCard post={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ---------- FAQ ---------- */}
      {faqs.length > 0 && (
        <section className="mx-auto grid max-w-7xl gap-10 pt-24 lg:grid-cols-[1fr_1.4fr]">
          <Reveal>
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-4 font-display text-4xl font-bold leading-[1.05] sm:text-5xl">
              Your questions. <span className="font-accent text-neutral-400">Answered.</span>
            </h2>
            <p className="mt-4 max-w-sm text-neutral-600">Can&apos;t find what you&apos;re looking for? Ask us directly.</p>
            <Link href="/contact" className="btn-outline mt-6 rounded-full px-5">
              Ask a question
            </Link>
          </Reveal>
          <Reveal delay={120} className="space-y-3">
            {faqs.map((f, i) => (
              <details key={i} className="group rounded-[20px] border border-black/5 bg-white p-5 open:shadow-sm" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {f.q}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ivory transition group-open:rotate-45 group-open:bg-amber">
                    <Plus className="h-4 w-4" />
                  </span>
                </summary>
                <p className="mt-3 whitespace-pre-line pr-10 text-sm leading-relaxed text-neutral-600">{f.a}</p>
              </details>
            ))}
          </Reveal>
        </section>
      )}

      {/* ---------- CTA ---------- */}
      <section className="mx-auto max-w-7xl pt-24">
        <Reveal className="relative overflow-hidden rounded-[28px] bg-amber px-6 py-14 text-ink sm:px-12 sm:py-20">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/25 blur-2xl" />
          <div className="relative max-w-2xl">
            <h2 className="font-display text-4xl font-bold leading-[1.05] sm:text-6xl">
              Find your next <span className="font-accent">favourite.</span>
            </h2>
            <p className="mt-4 text-lg text-ink/75">Order online or ask us on WhatsApp. Every order gets its own chat with us.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className="inline-flex items-center gap-3 rounded-full bg-ink py-2 pl-6 pr-2 font-semibold text-white">
                Shop Now
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber text-ink">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </Link>
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-ink/20 bg-white/40 px-6 py-3 font-semibold hover:bg-white/60"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              )}
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

function ProductSection({
  eyebrow,
  title,
  accent,
  products,
  categories,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  products: Product[];
  categories: { name: string; slug: string }[];
}) {
  return (
    <section className="mx-auto max-w-7xl pt-24">
      <Reveal className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="mt-4 font-display text-4xl font-bold leading-[1.05] sm:text-5xl">
            {title} <span className="font-accent text-neutral-400">{accent}</span>
          </h2>
        </div>
        <Link href="/shop" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:text-brass">
          View all <ArrowUpRight className="h-4 w-4" />
        </Link>
      </Reveal>
      {categories.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2 rounded-[20px] border border-black/5 bg-white p-2">
          <Link href="/shop" className="rounded-full bg-amber px-4 py-2 text-sm font-semibold text-ink">
            All products
          </Link>
          {categories.map((c) => (
            <Link key={c.slug} href={`/shop?category=${c.slug}`} className="rounded-full px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-ivory hover:text-ink">
              {c.name}
            </Link>
          ))}
        </div>
      )}
      {products.length === 0 ? (
        <div className="mt-8 rounded-[24px] border border-dashed border-black/15 bg-white/50 p-14 text-center">
          <p className="font-semibold">New products are on their way.</p>
          <p className="mt-1 text-sm text-neutral-500">Our next collection is being prepared. Check back soon.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p, i) => (
            <Reveal key={p.id} delay={(i % 4) * 90}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}
