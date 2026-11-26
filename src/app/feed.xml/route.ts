import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/site";
import type { Product } from "@/lib/types";
import { PRODUCT_SELECT } from "@/lib/types";

// Google Merchant Center product feed (free Google Shopping listings). One item per size/colour.
export const revalidate = 3600;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [{ data }, { data: settings }] = await Promise.all([
    supabase.from("products").select(PRODUCT_SELECT).eq("is_active", true).limit(5000),
    supabase.from("settings").select("delivery_charge").eq("id", 1).maybeSingle(),
  ]);
  const shippingPrice = Number(settings?.delivery_charge ?? 0).toFixed(2);
  const products = (data as Product[]) ?? [];

  const items: string[] = [];
  for (const p of products) {
    const images = [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((i) => i.image_url);
    if (!images.length) continue; // Google requires an image
    const link = `${SITE_URL}/product/${p.slug}`;
    const description = (p.description || `${p.name} by Quality Wear. Premium menswear with delivery across Pakistan.`).slice(0, 4900);
    const variants = p.product_variants?.length ? p.product_variants : [];
    for (const v of variants) {
      const title = `${p.name}${v.color ? ` – ${v.color}` : ""} – Size ${v.size}`;
      items.push(`    <item>
      <g:id>${esc(v.id)}</g:id>
      <g:item_group_id>${esc(p.id)}</g:item_group_id>
      <g:title>${esc(title.slice(0, 150))}</g:title>
      <g:description>${esc(description)}</g:description>
      <g:link>${esc(link)}</g:link>
      <g:image_link>${esc(images[0])}</g:image_link>
${images.slice(1, 10).map((i) => `      <g:additional_image_link>${esc(i)}</g:additional_image_link>`).join("\n")}
      <g:availability>${v.stock > 0 ? "in_stock" : "out_of_stock"}</g:availability>
      <g:price>${Number(p.price).toFixed(2)} PKR</g:price>
${p.sale_price != null ? `      <g:sale_price>${Number(p.sale_price).toFixed(2)} PKR</g:sale_price>` : ""}
      <g:brand>Quality Wear</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>no</g:identifier_exists>
      <g:google_product_category>1604</g:google_product_category>
${p.categories?.name ? `      <g:product_type>Men &gt; ${esc(p.categories.name)}</g:product_type>` : ""}
      <g:gender>male</g:gender>
      <g:age_group>adult</g:age_group>
      <g:size>${esc(v.size)}</g:size>
${v.color ? `      <g:color>${esc(v.color)}</g:color>` : ""}
      <g:shipping>
        <g:country>PK</g:country>
        <g:service>Standard</g:service>
        <g:price>${shippingPrice} PKR</g:price>
      </g:shipping>
    </item>`.replace(/\n\n+/g, "\n"));
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Quality Wear</title>
    <link>${SITE_URL}</link>
    <description>Quality Wear men's clothing, Sialkot, Pakistan</description>
${items.join("\n")}
  </channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
