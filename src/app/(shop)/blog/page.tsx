import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { BlogPost } from "@/lib/types";
import BlogCard, { BlogCover, blogDate, readingTime } from "@/components/shop/BlogCard";
import PageHero from "@/components/ui/PageHero";
import Reveal from "@/components/ui/Reveal";

export const metadata: Metadata = { title: "Journal" };

export default async function BlogPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(60);
  const posts = (data as BlogPost[]) ?? [];
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
                    <img src={lead.cover_url} alt={lead.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
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
