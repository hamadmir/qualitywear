import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { BlogPost } from "@/lib/types";
import RichText from "@/components/shop/RichText";
import BlogCard, { BlogCover, blogDate, readingTime } from "@/components/shop/BlogCard";
import Reveal from "@/components/ui/Reveal";

type Params = Promise<{ slug: string }>;

async function getPost(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("blog_posts").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
  return data as BlogPost | null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Journal" };
  return {
    title: post.title,
    description: post.excerpt ?? post.content.slice(0, 160),
    openGraph: post.cover_url ? { images: [post.cover_url] } : undefined,
  };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const supabase = await createClient();
  const { data: more } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("is_published", true)
    .neq("id", post.id)
    .order("published_at", { ascending: false })
    .limit(3);
  const others = (more as BlogPost[]) ?? [];

  return (
    <article className="px-3 pt-6 sm:px-5">
      <div className="mx-auto max-w-7xl">
        <div className="animate-fade-up mx-auto max-w-3xl pt-6 text-center">
          <Link href="/blog" className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-1.5 text-sm hover:border-ink">
            <ArrowLeft className="h-4 w-4" /> The Journal
          </Link>
          <p className="mt-8 text-sm text-neutral-500">
            {blogDate(post.published_at)} · {readingTime(post.content)} min read
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-[1.05] sm:text-6xl">{post.title}</h1>
          {post.excerpt && <p className="mx-auto mt-5 max-w-2xl text-lg text-neutral-600">{post.excerpt}</p>}
        </div>

        <div className="animate-fade-up delay-200 mx-auto mt-10 aspect-[21/9] max-w-5xl overflow-hidden rounded-[28px]">
          {post.cover_url ? (
            <img src={post.cover_url} alt={post.title} className="h-full w-full object-cover" />
          ) : (
            <BlogCover post={post} large />
          )}
        </div>

        <Reveal className="mx-auto mt-10 max-w-3xl rounded-[28px] bg-white p-6 sm:p-12">
          <RichText text={post.content} />
        </Reveal>

        <Reveal className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-between gap-4 rounded-[28px] bg-ink p-6 text-white sm:p-8">
          <p className="font-display text-2xl font-bold">
            Ready to put it <span className="font-accent text-amber">into practice?</span>
          </p>
          <Link href="/shop" className="inline-flex items-center gap-3 rounded-full bg-amber py-2 pl-5 pr-2 font-semibold text-ink">
            Shop the collection
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
        </Reveal>

        {others.length > 0 && (
          <section className="pt-24">
            <Reveal>
              <h2 className="font-display text-4xl font-bold">
                Keep <span className="font-accent text-neutral-400">reading.</span>
              </h2>
            </Reveal>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((p, i) => (
                <Reveal key={p.id} delay={i * 100}>
                  <BlogCard post={p} />
                </Reveal>
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
