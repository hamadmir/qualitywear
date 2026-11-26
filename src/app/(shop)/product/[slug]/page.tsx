import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/shop-data";
import { PRODUCT_SELECT, type Product } from "@/lib/types";
import { effectivePrice, mainImage, sortedImages, totalStock } from "@/lib/format";
import type { Review } from "@/lib/types";
import { summarize } from "@/lib/reviews";
import { absoluteUrl } from "@/lib/site";
import ProductReviews from "@/components/shop/ProductReviews";
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
  const price = effectivePrice(product);
  const description =
    product.description?.replace(/\s+/g, " ").slice(0, 155) ||
    `Buy ${product.name} online at Quality Wear for Rs. ${price.toLocaleString("en-PK")}. Delivery across Pakistan.`;
  return {
    title: `${product.name}${product.categories?.name ? ` – ${product.categories.name}` : ""}`,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      url: `/product/${product.slug}`,
      images: img ? [{ url: img, alt: product.name }] : undefined,
    },
    twitter: { card: img ? "summary_large_image" : "summary", title: product.name, description },
    other: {
      "product:price:amount": String(price),
      "product:price:currency": "PKR",
      "product:availability": totalStock(product) > 0 ? "in stock" : "out of stock",
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProduct(slug), getSettings()]);
  if (!product) notFound();

  const supabase = await createClient();
  const { data: reviewRows } = await supabase
    .from("product_reviews")
    .select("*")
    .eq("product_id", product.id)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(100);
  const reviews = (reviewRows as Review[]) ?? [];
  const summary = summarize(reviews.map((r) => r.rating));
  const price = effectivePrice(product);
  const url = absoluteUrl(`/product/${product.slug}`);
  const priceValidUntil = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString().slice(0, 10);
  const jsonLd: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.description || undefined,
      image: sortedImages(product).map((i) => i.image_url),
      sku: product.id,
      brand: { "@type": "Brand", name: "Quality Wear" },
      category: product.categories?.name,
      url,
      offers: {
        "@type": "Offer",
        url,
        priceCurrency: "PKR",
        price: price.toFixed(0),
        priceValidUntil,
        itemCondition: "https://schema.org/NewCondition",
        availability: totalStock(product) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        seller: { "@type": "Organization", name: "Quality Wear" },
        shippingDetails: {
          "@type": "OfferShippingDetails",
          shippingRate: { "@type": "MonetaryAmount", value: Number(settings.delivery_charge ?? 0).toFixed(0), currency: "PKR" },
          shippingDestination: { "@type": "DefinedRegion", addressCountry: "PK" },
          deliveryTime: {
            "@type": "ShippingDeliveryTime",
            handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 2, unitCode: "DAY" },
            transitTime: { "@type": "QuantitativeValue", minValue: 3, maxValue: 5, unitCode: "DAY" },
          },
        },
      },
      ...(summary.count > 0
        ? {
            aggregateRating: { "@type": "AggregateRating", ratingValue: summary.avg, reviewCount: summary.count, bestRating: 5, worstRating: 1 },
            review: reviews.slice(0, 10).map((r) => ({
              "@type": "Review",
              author: { "@type": "Person", name: r.customer_name },
              datePublished: r.created_at.slice(0, 10),
              reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
              reviewBody: r.body || undefined,
            })),
          }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Shop", item: absoluteUrl("/shop") },
        ...(product.categories
          ? [{ "@type": "ListItem", position: 3, name: product.categories.name, item: absoluteUrl(`/shop?category=${product.categories.slug}`) }]
          : []),
        { "@type": "ListItem", position: product.categories ? 4 : 3, name: product.name, item: url },
      ],
    },
  ];
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
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

      <ProductDetail product={product} whatsappNumber={settings.whatsapp_number} rating={{ avg: summary.avg, count: summary.count }} />

      <ProductReviews reviews={reviews} />

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
