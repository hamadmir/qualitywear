import Link from "next/link";
import type { Metadata } from "next";
import { SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/shop-data";
import { PRODUCT_SELECT, type Product } from "@/lib/types";
import { effectivePrice } from "@/lib/format";
import ProductCard from "@/components/shop/ProductCard";
import PageHero from "@/components/ui/PageHero";
import Reveal from "@/components/ui/Reveal";

export const metadata: Metadata = { title: "Shop" };

type SearchParams = Promise<{ category?: string; q?: string; sort?: string; size?: string; sale?: string }>;

const SORTS = [
  { value: "new", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const { category, q, sort = "new", size, sale } = await searchParams;
  const supabase = await createClient();
  const categories = await getCategories();
  const activeCategory = categories.find((c) => c.slug === category);

  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(300);
  if (activeCategory) query = query.eq("category_id", activeCategory.id);
  if (sale) query = query.not("sale_price", "is", null);
  if (q) {
    const term = q.replace(/[%_,()]/g, " ").trim();
    if (term) query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }

  const { data } = await query;
  let products = (data as Product[]) ?? [];

  const allSizes = Array.from(
    new Set(products.flatMap((p) => p.product_variants.filter((v) => v.stock > 0).map((v) => v.size)))
  );

  if (size) products = products.filter((p) => p.product_variants.some((v) => v.size === size && v.stock > 0));
  if (sort === "price_asc") products.sort((a, b) => effectivePrice(a) - effectivePrice(b));
  if (sort === "price_desc") products.sort((a, b) => effectivePrice(b) - effectivePrice(a));

  function href(next: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { category, q, sort, size, sale, ...next };
    Object.entries(merged).forEach(([k, v]) => {
      if (v && !(k === "sort" && v === "new")) params.set(k, v);
    });
    const s = params.toString();
    return s ? `/shop?${s}` : "/shop";
  }

  const title = q ? `Results for “${q}”` : activeCategory?.name ?? "The collection.";
  const accent = q ? undefined : activeCategory ? "Collection." : "Made to last.";

  const pill = (active: boolean) =>
    `whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
      active ? "bg-ink text-white" : "text-neutral-600 hover:bg-ivory hover:text-ink"
    }`;

  return (
    <div className="px-3 sm:px-5">
      <PageHero
        eyebrow="Shop"
        title={title}
        accent={accent}
        subtitle="Premium shirts, jeans, polos and jackets. Delivered across Pakistan, with easy exchanges."
        image={activeCategory?.image_url}
      />

      <div className="mx-auto max-w-7xl">
        <Reveal className="mt-6 rounded-[22px] border border-black/5 bg-white p-2">
          <div className="flex gap-1 overflow-x-auto">
            <Link href={href({ category: undefined })} className={pill(!activeCategory && !sale)}>
              All
            </Link>
            {categories.map((c) => (
              <Link key={c.id} href={href({ category: c.slug, sale: undefined })} className={pill(activeCategory?.id === c.id)}>
                {c.name}
              </Link>
            ))}
            <Link href={href({ category: undefined, sale: sale ? undefined : "1" })} className={pill(!!sale)}>
              On sale
            </Link>
          </div>
        </Reveal>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 px-1">
          <p className="text-sm text-neutral-500">
            <span className="font-semibold text-ink">{products.length}</span> {products.length === 1 ? "product" : "products"}
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <SlidersHorizontal className="h-4 w-4 text-neutral-400" />
            {allSizes.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-neutral-500">Size</span>
                <Link
                  href={href({ size: undefined })}
                  className={`rounded-full border px-2.5 py-1 text-xs ${!size ? "border-ink bg-ink text-white" : "border-black/10 bg-white"}`}
                >
                  Any
                </Link>
                {allSizes.map((s) => (
                  <Link
                    key={s}
                    href={href({ size: s })}
                    className={`rounded-full border px-2.5 py-1 text-xs ${size === s ? "border-ink bg-ink text-white" : "border-black/10 bg-white hover:border-ink"}`}
                  >
                    {s}
                  </Link>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-neutral-500">Sort</span>
              {SORTS.map((s) => (
                <Link
                  key={s.value}
                  href={href({ sort: s.value })}
                  className={`rounded-full border px-2.5 py-1 text-xs ${sort === s.value ? "border-ink bg-ink text-white" : "border-black/10 bg-white hover:border-ink"}`}
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {products.length === 0 ? (
          <Reveal className="mt-8 rounded-[28px] border border-dashed border-black/15 bg-white/60 p-14 text-center">
            <p className="text-lg font-semibold">No products found.</p>
            <p className="mt-1 text-sm text-neutral-500">Try another category or clear your filters. New pieces arrive regularly.</p>
            <Link href="/shop" className="btn-outline mt-6 rounded-full px-6">
              Clear filters
            </Link>
          </Reveal>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 80}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
