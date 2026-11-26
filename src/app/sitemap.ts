import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL, tagSlug } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [{ data: posts }, { data: products }, { data: categories }] = await Promise.all([
    supabase.from("blog_posts").select("slug, tags, updated_at").eq("is_published", true),
    supabase.from("products").select("slug, updated_at").eq("is_active", true),
    supabase.from("categories").select("slug"),
  ]);

  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/store`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/track`, changeFrequency: "yearly", priority: 0.2 },
  ];
  (categories ?? []).forEach((c) =>
    pages.push({ url: `${SITE_URL}/shop?category=${c.slug}`, changeFrequency: "weekly", priority: 0.8 })
  );
  (products ?? []).forEach((p) =>
    pages.push({ url: `${SITE_URL}/product/${p.slug}`, lastModified: p.updated_at, changeFrequency: "weekly", priority: 0.7 })
  );
  const tags = new Set<string>();
  (posts ?? []).forEach((p) => {
    pages.push({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: p.updated_at, changeFrequency: "monthly", priority: 0.7 });
    (p.tags ?? []).forEach((t: string) => tags.add(tagSlug(t)));
  });
  tags.forEach((t) => pages.push({ url: `${SITE_URL}/blog?tag=${t}`, changeFrequency: "weekly", priority: 0.4 }));
  return pages;
}
