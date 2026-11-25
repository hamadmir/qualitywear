import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { BlogPost } from "@/lib/types";

export function blogDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Karachi" });
}

export function readingTime(text: string) {
  return Math.max(1, Math.round(text.split(/\s+/).length / 200));
}

/** Elegant generated cover used when a post has no picture. */
export function BlogCover({ post, large = false }: { post: BlogPost; large?: boolean }) {
  const tones = ["from-[#1b1b1b] to-[#3a2f12]", "from-[#111] to-[#1f2a2a]", "from-[#161616] to-[#2b1d1d]", "from-[#121212] to-[#232a1a]"];
  const tone = tones[post.title.length % tones.length];
  return (
    <div className={`relative flex h-full w-full flex-col justify-end overflow-hidden bg-gradient-to-br ${tone} p-6`}>
      <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-amber/20 blur-3xl" />
      <span className="absolute right-6 top-5 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">QW Journal</span>
      <p className={`font-accent relative text-white/90 ${large ? "text-5xl" : "text-3xl"} leading-[1.05]`}>
        {post.title.split(":")[0]}
      </p>
    </div>
  );
}

export default function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex h-full flex-col rounded-[24px] border border-black/5 bg-white p-2.5 transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)]">
      <div className="aspect-[16/11] overflow-hidden rounded-[18px] bg-sand">
        {post.cover_url ? (
          <img src={post.cover_url} alt={post.title} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        ) : (
          <div className="h-full transition duration-700 group-hover:scale-105">
            <BlogCover post={post} />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col px-3 pb-3 pt-5">
        <p className="text-xs font-medium text-neutral-400">
          {blogDate(post.published_at)} · {readingTime(post.content)} min read
        </p>
        <h3 className="mt-2 text-xl font-bold leading-snug tracking-tight">{post.title}</h3>
        {post.excerpt && <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{post.excerpt}</p>}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold">
          Read article
          <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}
