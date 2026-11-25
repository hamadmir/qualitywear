import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/shop-data";
import { PRODUCT_SELECT, type Product } from "@/lib/types";
import { mainImage } from "@/lib/format";
import ProductDetail from "@/components/shop/ProductDetail";
import ProductCard from "@/components/shop/ProductCard";
import Reveal from "@/components/ui/Reveal";

type Params = Promise<{ slug: string }>;

async function getProduct(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data as Product | null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product not found" };
  const img = mainImage(product);
  return {
    title: product.name,
    description: product.description?.slice(0, 160) ?? undefined,
    openGraph: img ? { images: [img] } : undefined,
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProduct(slug), getSettings()]);
  if (!product) notFound();

  const supabase = await createClient();
  let related: Product[] = [];
  if (product.category_id) {
    const { data } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_active", true)
      .eq("category_id", product.category_id)
      .neq("id", product.id)
      .limit(4);
    related = (data as Product[]) ?? [];
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-5">
      <nav className="mb-6 text-sm text-neutral-500">
        <Link href="/" className="hover:text-ink">Home</Link> /{" "}
        <Link href="/shop" className="hover:text-ink">Shop</Link>
        {product.categories && (
          <>
            {" "}/{" "}
            <Link href={`/shop?category=${product.categories.slug}`} className="hover:text-ink">
              {product.categories.name}
            </Link>
          </>
        )}
      </nav>

      <ProductDetail product={product} whatsappNumber={settings.whatsapp_number} />

      {related.length > 0 && (
        <section className="mt-24">
          <Reveal>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
              <span className="h-1.5 w-1.5 rounded-full bg-amber" /> Complete the look
            </p>
            <h2 className="mt-3 font-display text-4xl font-bold">
              You may also <span className="font-accent text-neutral-400">like.</span>
            </h2>
          </Reveal>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {related.map((p, i) => (
              <Reveal key={p.id} delay={i * 90}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
