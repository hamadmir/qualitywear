import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight, Hash } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { BlogPost } from "@/lib/types";
import RichText, { extractFaq, extractHeadings, plainText } from "@/components/shop/RichText";
import { absoluteUrl, tagSlug } from "@/lib/site";
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
  const description = post.meta_description || post.excerpt || plainText(post.content).slice(0, 158);
  const title = post.meta_title || post.title;
  return {
    title,
    description,
    keywords: post.tags,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/blog/${post.slug}`,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      tags: post.tags,
      images: post.cover_url ? [{ url: post.cover_url, alt: post.cover_alt || post.title }] : undefined,
    },
    twitter: { card: post.cover_url ? "summary_large_image" : "summary", title, description },
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
    .limit(60);
  const pool = (more as BlogPost[]) ?? [];
  const tagSet = new Set((post.tags ?? []).map(tagSlug));
  const others = pool
    .map((p, i) => ({ p, score: (p.tags ?? []).filter((t) => tagSet.has(tagSlug(t))).length * 10 - i / 100 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.p);

  const headings = extractHeadings(post.content).filter((h) => !/frequently asked/i.test(h.text));
  const faq = extractFaq(post.content);
  const url = absoluteUrl(`/blog/${post.slug}`);
  const jsonLd: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.meta_description || post.excerpt || undefined,
      image: post.cover_url ? [post.cover_url] : [absoluteUrl("/icon-512.png")],
      datePublished: post.published_at,
      dateModified: post.updated_at,
      keywords: (post.tags ?? []).join(", "),
      wordCount: post.content.split(/\s+/).length,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      author: { "@type": "Organization", name: "Quality Wear", url: absoluteUrl("/") },
      publisher: { "@type": "Organization", name: "Quality Wear", logo: { "@type": "ImageObject", url: absoluteUrl("/icon-512.png") } },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Journal", item: absoluteUrl("/blog") },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ];
  if (faq.length) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    });
  }

  return (
    <article className="px-3 pt-6 sm:px-5">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="mx-auto max-w-7xl">
        <div className="animate-fade-up mx-auto max-w-3xl pt-6 text-center">
          <nav aria-label="Breadcrumb" className="flex items-center justify-center gap-2 text-sm text-neutral-500">
            <Link href="/" className="hover:text-ink">Home</Link>
            <span>/</span>
            <Link href="/blog" className="inline-flex items-center gap-1 hover:text-ink">
              <ArrowLeft className="h-3.5 w-3.5" /> Journal
            </Link>
          </nav>
          <p className="mt-8 text-sm text-neutral-500">
            {blogDate(post.published_at)} · {readingTime(post.content)} min read
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-[1.05] sm:text-6xl">{post.title}</h1>
          {post.excerpt && <p className="mx-auto mt-5 max-w-2xl text-lg text-neutral-600">{post.excerpt}</p>}
        </div>

        <div className="animate-fade-up delay-200 mx-auto mt-10 aspect-[21/9] max-w-5xl overflow-hidden rounded-[28px]">
          {post.cover_url ? (
            <img src={post.cover_url} alt={post.cover_alt || post.title} className="h-full w-full object-cover" />
          ) : (
            <BlogCover post={post} large />
          )}
        </div>

        {headings.length >= 3 && (
          <nav aria-label="In this article" className="mx-auto mt-10 max-w-3xl rounded-[28px] border border-black/5 bg-white/70 p-6 sm:px-12">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">In this article</p>
            <ol className="mt-3 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
              {headings.map((h, i) => (
                <li key={h.id}>
                  <a href={`#${h.id}`} className="flex gap-2 text-neutral-700 hover:text-brass">
                    <span className="font-mono text-brass">{String(i + 1).padStart(2, "0")}</span>
                    {h.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="mx-auto mt-6 max-w-3xl rounded-[28px] bg-white p-6 sm:p-12">
          <RichText text={post.content} />
          {post.tags?.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2 border-t border-black/5 pt-6">
              {post.tags.map((t) => (
                <Link
                  key={t}
                  href={`/blog?tag=${tagSlug(t)}`}
                  rel="tag"
                  className="inline-flex items-center gap-1 rounded-full bg-ivory px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-ink hover:text-white"
                >
                  <Hash className="h-3 w-3" />
                  {t}
                </Link>
              ))}
            </div>
          )}
        </div>

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
