import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, Hash } from "lucide-react";
import { tagSlug } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import type { BlogPost } from "@/lib/types";
import BlogCard, { BlogCover, blogDate, readingTime } from "@/components/shop/BlogCard";
import PageHero from "@/components/ui/PageHero";
import Reveal from "@/components/ui/Reveal";

type SearchParams = Promise<{ tag?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { tag } = await searchParams;
  if (tag) {
    const label = tag.replace(/-/g, " ");
    return {
      title: `${label.replace(/\b\w/g, (c) => c.toUpperCase())} – Style Guides`,
      description: `Articles about ${label} from the Quality Wear Journal: fit guides, styling ideas and buying tips for men in Pakistan.`,
      alternates: { canonical: `/blog?tag=${tag}` },
    };
  }
  return {
    title: "Men's Style Journal – Fit Guides & Fashion Tips for Pakistan",
    description:
      "Men's fashion tips for Pakistan: shirt and jeans size guides, what to wear for weddings, office and winter, fabric care and styling ideas from Quality Wear, Sialkot.",
    alternates: { canonical: "/blog" },
  };
}

export default async function BlogPage({ searchParams }: { searchParams: SearchParams }) {
  const { tag } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(200);
  const all = (data as BlogPost[]) ?? [];
  const counts = new Map<string, { label: string; n: number }>();
  all.forEach((p) =>
    (p.tags ?? []).forEach((t) => {
      const k = tagSlug(t);
      counts.set(k, { label: counts.get(k)?.label ?? t, n: (counts.get(k)?.n ?? 0) + 1 });
    })
  );
  const topTags = [...counts.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 18);
  const posts = tag ? all.filter((p) => (p.tags ?? []).some((t) => tagSlug(t) === tag)) : all;
  const activeLabel = tag ? counts.get(tag)?.label ?? tag.replace(/-/g, " ") : null;
  const [lead, ...rest] = posts;

  return (
    <div className="px-3 sm:px-5">
      <PageHero
        eyebrow="The Journal"
        title="Style notes,"
        accent="worth a read."
        subtitle="Fit guides, styling ideas and simple tips to keep your clothes looking new."
      />

      <div className="mx-auto max-w-7xl">
        {topTags.length > 0 && (
          <nav aria-label="Topics" className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/blog"
              className={`rounded-full px-4 py-2 text-sm font-semibold ${!tag ? "bg-ink text-white" : "border border-black/10 bg-white hover:border-ink"}`}
            >
              All articles
            </Link>
            {topTags.map(([k, v]) => (
              <Link
                key={k}
                href={`/blog?tag=${k}`}
                className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium ${
                  tag === k ? "bg-ink text-white" : "border border-black/10 bg-white text-neutral-700 hover:border-ink"
                }`}
              >
                <Hash className="h-3.5 w-3.5 opacity-50" />
                {v.label}
              </Link>
            ))}
          </nav>
        )}
        {activeLabel && (
          <h2 className="mt-8 font-display text-3xl font-bold">
            Articles about <span className="font-accent text-brass">{activeLabel}</span>
          </h2>
        )}
        {!lead ? (
          <Reveal className="mt-6 rounded-[28px] border border-dashed border-black/15 bg-white/60 p-14 text-center">
            <p className="text-lg font-semibold">Our first article is coming soon.</p>
            <Link href="/shop" className="btn-outline mt-6 rounded-full px-6">Shop in the meantime</Link>
          </Reveal>
        ) : (
          <>
            <Reveal className="mt-6">
              <Link
                href={`/blog/${lead.slug}`}
                className="group grid overflow-hidden rounded-[28px] border border-black/5 bg-white p-2.5 lg:grid-cols-2"
              >
                <div className="aspect-[16/11] overflow-hidden rounded-[22px] lg:aspect-auto lg:min-h-[380px]">
                  {lead.cover_url ? (
                    <img src={lead.cover_url} alt={lead.cover_alt || lead.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="h-full transition duration-700 group-hover:scale-105">
                      <BlogCover post={lead} large />
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center p-6 sm:p-10">
                  <span className="w-fit rounded-full bg-amber px-3 py-1 text-xs font-bold">Latest</span>
                  <p className="mt-5 text-sm text-neutral-400">
                    {blogDate(lead.published_at)} · {readingTime(lead.content)} min read
                  </p>
                  <h2 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-4xl">{lead.title}</h2>
                  {lead.excerpt && <p className="mt-4 text-neutral-600">{lead.excerpt}</p>}
                  <span className="mt-8 inline-flex w-fit items-center gap-3 rounded-full bg-ink py-2 pl-5 pr-2 text-sm font-semibold text-white">
                    Read article
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber text-ink">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </span>
                </div>
              </Link>
            </Reveal>

            {rest.length > 0 && (
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((p, i) => (
                  <Reveal key={p.id} delay={(i % 3) * 100}>
                    <BlogCard post={p} />
                  </Reveal>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
