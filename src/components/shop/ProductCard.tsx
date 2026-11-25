import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Product } from "@/lib/types";
import { discountPercent, effectivePrice, rs, sortedImages, totalStock } from "@/lib/format";

export default function ProductCard({ product }: { product: Product }) {
  const imgs = sortedImages(product);
  const img = imgs[0]?.image_url ?? null;
  const hover = imgs[1]?.image_url ?? null;
  const off = discountPercent(product);
  const soldOut = totalStock(product) === 0;
  const isNew = Date.now() - new Date(product.created_at).getTime() < 14 * 86400 * 1000;
  const sizes = Array.from(new Set(product.product_variants.filter((v) => v.stock > 0).map((v) => v.size))).slice(0, 5);

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col rounded-[22px] border border-black/5 bg-white p-2.5 transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)]"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-sand">
        {img ? (
          <>
            <img
              src={img}
              alt={product.name}
              loading="lazy"
              className={`h-full w-full object-cover transition duration-500 ${hover ? "group-hover:opacity-0" : "group-hover:scale-105"}`}
            />
            {hover && (
              <img
                src={hover}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-3xl font-extrabold tracking-tight text-neutral-300">QW</div>
        )}
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {off > 0 && !soldOut && (
            <span className="rounded-full bg-amber px-2.5 py-1 text-[11px] font-bold text-ink">-{off}%</span>
          )}
          {isNew && !soldOut && (
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">New</span>
          )}
          {soldOut && <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-white">Sold out</span>}
        </div>
        <span className="absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink opacity-0 shadow transition group-hover:opacity-100">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
      <div className="flex flex-1 flex-col px-1.5 pb-1.5 pt-3">
        {product.categories?.name && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{product.categories.name}</p>
        )}
        <h3 className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight">{product.name}</h3>
        {sizes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {sizes.map((s) => (
              <span key={s} className="rounded-md border border-black/10 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                {s}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-baseline gap-2 pt-3">
          <span className="text-base font-bold">{rs(effectivePrice(product))}</span>
          {product.sale_price != null && <span className="text-sm text-neutral-400 line-through">{rs(product.price)}</span>}
        </div>
      </div>
    </Link>
  );
}
