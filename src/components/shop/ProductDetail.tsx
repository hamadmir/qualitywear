"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Banknote, Check, Minus, Plus, RefreshCcw, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import type { Product } from "@/lib/types";
import { discountPercent, effectivePrice, rs, sortedImages, whatsappLink } from "@/lib/format";
import { useCart } from "./CartProvider";
import { WhatsAppIcon } from "./WhatsAppButton";

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "3XL", "4XL"];
function sizeRank(s: string) {
  const i = SIZE_ORDER.indexOf(s.toUpperCase());
  if (i >= 0) return i;
  const n = parseFloat(s);
  return Number.isNaN(n) ? 100 : 10 + n;
}

export default function ProductDetail({ product, whatsappNumber }: { product: Product; whatsappNumber: string | null }) {
  const images = sortedImages(product);
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const { add } = useCart();

  const variants = product.product_variants;
  const colors = useMemo(() => Array.from(new Set(variants.map((v) => v.color))).filter((c) => c !== ""), [variants]);
  const [color, setColor] = useState<string>(
    colors.find((c) => variants.some((v) => v.color === c && v.stock > 0)) ?? colors[0] ?? ""
  );
  const sizesForColor = useMemo(
    () =>
      variants
        .filter((v) => (colors.length ? v.color === color : true))
        .sort((a, b) => sizeRank(a.size) - sizeRank(b.size)),
    [variants, colors.length, color]
  );

  const [variantId, setVariantId] = useState<string | null>(null);
  const selected = sizesForColor.find((v) => v.id === variantId) ?? null;
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");

  const price = effectivePrice(product);
  const off = discountPercent(product);
  const allSoldOut = variants.every((v) => v.stock === 0);

  function handleAdd() {
    if (!selected) {
      setError("Please select a size first.");
      return;
    }
    add({
      variantId: selected.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: images[0]?.image_url ?? null,
      size: selected.size,
      color: selected.color,
      price,
      quantity: qty,
      maxStock: selected.stock,
    });
    setError("");
    setAdded(true);
    setTimeout(() => setAdded(false), 3000);
  }

  const wa = whatsappLink(
    whatsappNumber,
    `Hi Quality Wear! I'd like to order: ${product.name}` +
      (selected ? ` (Size: ${selected.size}${selected.color ? ", " + selected.color : ""})` : "") +
      ` — ${rs(price)}`
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
      {/* Gallery */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto sm:w-20 sm:flex-col">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setActive(i)}
                className={`aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-xl border-2 transition sm:w-full ${
                  i === active ? "border-ink" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img src={img.image_url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
        <div
          className="relative aspect-[4/5] flex-1 cursor-zoom-in overflow-hidden rounded-[24px] bg-sand"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          }}
          onMouseLeave={() => setZoom(null)}
        >
          {images[active] ? (
            <img
              key={images[active].id}
              src={images[active].image_url}
              alt={product.name}
              className="animate-fade-in h-full w-full object-cover transition-transform duration-200"
              style={zoom ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl font-extrabold tracking-tight text-neutral-300">QW</div>
          )}
          <div className="pointer-events-none absolute left-4 top-4 flex gap-2">
            {off > 0 && <span className="rounded-full bg-amber px-3 py-1 text-xs font-bold text-ink">-{off}%</span>}
            {allSoldOut && <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">Sold out</span>}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        {product.categories?.name && (
          <Link
            href={`/shop?category=${product.categories.slug}`}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 hover:text-ink"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber" />
            {product.categories.name}
          </Link>
        )}
        <h1 className="mt-3 font-display text-4xl font-bold leading-[1.05] sm:text-5xl">{product.name}</h1>
        <div className="mt-5 flex items-baseline gap-3">
          <span className="text-3xl font-bold tracking-tight">{rs(price)}</span>
          {product.sale_price != null && (
            <>
              <span className="text-lg text-neutral-400 line-through">{rs(product.price)}</span>
              <span className="rounded-full bg-amber/20 px-2.5 py-0.5 text-xs font-bold text-brass-dark">Save {off}%</span>
            </>
          )}
        </div>
        <p className="mt-1 text-sm text-neutral-500">Bank transfer · JazzCash · Easypaisa</p>

        <div className="mt-8 rounded-[24px] border border-black/5 bg-white p-5 sm:p-6">
          {colors.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-semibold">
                Colour: <span className="font-normal text-neutral-500">{color}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setColor(c);
                      setVariantId(null);
                      setQty(1);
                    }}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      c === color ? "border-ink bg-ink text-white" : "border-black/10 hover:border-ink"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Select size</p>
            {selected && selected.stock <= 3 && (
              <p className="text-xs font-semibold text-amber-700">Only {selected.stock} left</p>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {sizesForColor.map((v) => (
              <button
                key={v.id}
                disabled={v.stock === 0}
                onClick={() => {
                  setVariantId(v.id);
                  setQty(1);
                  setError("");
                }}
                className={`h-11 min-w-12 rounded-full border px-4 text-sm font-semibold transition ${
                  v.stock === 0
                    ? "cursor-not-allowed border-black/5 bg-neutral-100 text-neutral-300 line-through"
                    : v.id === variantId
                      ? "border-ink bg-ink text-white"
                      : "border-black/10 hover:border-ink"
                }`}
              >
                {v.size}
              </button>
            ))}
          </div>

          {!allSoldOut ? (
            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-12 items-center rounded-full border border-black/10">
                <button className="px-4" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                <button
                  className="px-4"
                  onClick={() => setQty((q) => Math.min(selected?.stock ?? 10, q + 1))}
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={handleAdd}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ink font-semibold text-white transition hover:bg-black"
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4 text-amber" /> Added to cart
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" /> Add to cart
                  </>
                )}
              </button>
            </div>
          ) : (
            <p className="mt-6 rounded-full bg-neutral-100 p-3 text-center text-sm font-semibold text-neutral-600">
              This item is currently sold out
            </p>
          )}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {added && (
            <Link
              href="/cart"
              className="animate-fade-up mt-3 flex h-12 items-center justify-center gap-2 rounded-full bg-amber font-semibold text-ink"
            >
              View cart & checkout <ArrowUpRight className="h-4 w-4" />
            </Link>
          )}
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex h-12 items-center justify-center gap-2 rounded-full border border-[#25D366]/40 font-semibold text-[#128C7E] transition hover:bg-[#25D366]/10"
            >
              <WhatsAppIcon className="h-5 w-5" /> Order on WhatsApp
            </a>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {[
            { icon: Banknote, t: "Bank, JazzCash, Easypaisa" },
            { icon: Truck, t: "Delivery in 3–5 days" },
            { icon: RefreshCcw, t: "Easy size exchange" },
            { icon: ShieldCheck, t: "Quality checked" },
          ].map((b) => (
            <div key={b.t} className="flex items-center gap-2.5 rounded-2xl border border-black/5 bg-white px-4 py-3">
              <b.icon className="h-4 w-4 shrink-0 text-brass" />
              <span className="font-medium">{b.t}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {product.description && (
            <details open className="group rounded-[20px] border border-black/5 bg-white p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                Product details
                <Plus className="h-4 w-4 transition group-open:rotate-45" />
              </summary>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-neutral-600">{product.description}</p>
            </details>
          )}
          <details className="group rounded-[20px] border border-black/5 bg-white p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
              Delivery & payment
              <Plus className="h-4 w-4 transition group-open:rotate-45" />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">
              We deliver to every city in Pakistan, usually within 3 to 5 working days. After you order, we confirm your items and share payment details in your order chat.
            </p>
          </details>
          <details className="group rounded-[20px] border border-black/5 bg-white p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
              Exchanges
              <Plus className="h-4 w-4 transition group-open:rotate-45" />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">
              If the size isn&apos;t right, contact us on WhatsApp or through our Contact page and we will help you exchange it.
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}
