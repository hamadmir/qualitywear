"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BUCKET, deleteImages, uploadImage } from "@/lib/image-upload";
import { slugify } from "@/lib/format";
import type { BlogPost } from "@/lib/types";

function pathFromUrl(url: string | null) {
  if (!url) return null;
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null;
}

export default function BlogForm({ post }: { post?: BlogPost }) {
  const router = useRouter();
  const isEdit = !!post;
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [published, setPublished] = useState(post?.is_published ?? true);
  const [coverUrl, setCoverUrl] = useState<string | null>(post?.cover_url ?? null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Please enter a title");
    if (!content.trim()) return setError("Please write the article");
    if (!slugify(slug || title)) return setError("Please enter a URL (slug)");
    setSaving(true);
    setError("");
    const supabase = createClient();
    try {
      let cover = coverUrl;
      if (coverFile) {
        const up = await uploadImage(supabase, coverFile, "blog");
        cover = up.url;
      }
      const payload = {
        title: title.trim(),
        slug: slugify(slug || title),
        excerpt: excerpt.trim() || null,
        content: content.trim(),
        cover_url: cover,
        is_published: published,
        published_at: published ? post?.published_at ?? new Date().toISOString() : null,
      };
      const { error } = isEdit
        ? await supabase.from("blog_posts").update(payload).eq("id", post!.id)
        : await supabase.from("blog_posts").insert(payload);
      if (error) throw error;
      if (post?.cover_url && post.cover_url !== cover) await deleteImages(supabase, [pathFromUrl(post.cover_url)]);
      router.push("/admin/blog");
      router.refresh();
    } catch (err) {
      const msg = (err as { message?: string }).message ?? "Error";
      setError(msg.includes("blog_posts_slug_key") ? "This URL (slug) is already used by another article" : msg);
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!post || !confirm(`Delete "${post.title}"?`)) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("blog_posts").delete().eq("id", post.id);
    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }
    await deleteImages(supabase, [pathFromUrl(post.cover_url)]);
    router.push("/admin/blog");
    router.refresh();
  }

  const preview = coverFile ? URL.createObjectURL(coverFile) : coverUrl;

  return (
    <form onSubmit={onSave}>
      <Link href="/admin/blog" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Journal
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{isEdit ? "Edit article" : "New article"}</h1>
        {isEdit && post.is_published && (
          <Link href={`/blog/${post.slug}`} target="_blank" className="text-sm text-brass hover:underline">
            View on website ↗
          </Link>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <section className="card space-y-4 p-5">
          <div>
            <label className="label" htmlFor="b-title">Title *</label>
            <input
              id="b-title"
              className="input"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              placeholder="e.g. 5 ways to style a white shirt"
            />
          </div>
          <div>
            <label className="label" htmlFor="b-slug">URL (slug)</label>
            <div className="flex items-center rounded-md border border-neutral-300 bg-neutral-50 text-sm">
              <span className="pl-3 text-neutral-500">/blog/</span>
              <input
                id="b-slug"
                className="flex-1 bg-transparent px-1 py-2 outline-none"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="b-excerpt">Short summary</label>
            <textarea
              id="b-excerpt"
              rows={2}
              className="input"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="1–2 lines shown in the article list"
            />
          </div>
          <div>
            <label className="label" htmlFor="b-content">Article *</label>
            <textarea
              id="b-content"
              rows={16}
              className="input font-mono text-[13px] leading-relaxed"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <p className="mt-1 text-xs text-neutral-500">
              Tips: leave an empty line for a new paragraph · start a line with &quot;## &quot; for a heading · start with &quot;- &quot; for a bullet list
            </p>
          </div>
        </section>

        <div className="space-y-6">
          <section className="card p-5">
            <p className="label">Cover image</p>
            <label className="flex aspect-[16/10] cursor-pointer items-center justify-center overflow-hidden rounded-md border-2 border-dashed border-neutral-300 text-sm text-neutral-500 hover:border-ink">
              {preview ? (
                <img src={preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1">
                  <ImagePlus className="h-6 w-6" /> Choose a picture
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {preview && (
              <button
                type="button"
                onClick={() => {
                  setCoverFile(null);
                  setCoverUrl(null);
                }}
                className="mt-2 text-xs text-red-600 hover:underline"
              >
                Remove picture
              </button>
            )}
          </section>

          <section className="card p-5 text-sm">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4" />
              <span>
                <span className="font-medium">Publish on website</span>
                <span className="block text-xs text-neutral-500">Leave off to keep it as a draft</span>
              </span>
            </label>
          </section>

          {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={saving} className="btn-primary w-full py-3">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} {isEdit ? "Save changes" : "Publish article"}
          </button>
          {isEdit && (
            <button type="button" onClick={onDelete} disabled={saving} className="btn w-full text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" /> Delete article
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
