"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteImages, uploadImage, BUCKET } from "@/lib/image-upload";
import { slugify } from "@/lib/format";
import type { Category } from "@/lib/types";

type Draft = {
  id?: string;
  name: string;
  sort_order: string;
  is_active: boolean;
  image_url: string | null;
  size_chart: string;
  file?: File;
  preview?: string;
};

const EMPTY: Draft = { name: "", sort_order: "0", is_active: true, image_url: null, size_chart: "" };

function storagePathFromUrl(url: string | null) {
  if (!url) return null;
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null;
}

export default function CategoryManager({
  categories,
  productCounts,
}: {
  categories: Category[];
  productCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    if (!draft.name.trim()) {
      setError("Please enter a name");
      return;
    }
    setSaving(true);
    setError("");
    const supabase = createClient();
    try {
      let image_url = draft.image_url;
      const old = draft.id ? categories.find((c) => c.id === draft.id) : null;
      if (draft.file) {
        const up = await uploadImage(supabase, draft.file, "categories");
        image_url = up.url;
      }
      const payload = {
        name: draft.name.trim(),
        slug: slugify(draft.name),
        sort_order: Number(draft.sort_order) || 0,
        is_active: draft.is_active,
        image_url,
        size_chart: draft.size_chart.trim() || null,
      };
      const { error } = draft.id
        ? await supabase.from("categories").update(payload).eq("id", draft.id)
        : await supabase.from("categories").insert(payload);
      if (error) throw error;
      if (old?.image_url && old.image_url !== image_url) {
        await deleteImages(supabase, [storagePathFromUrl(old.image_url)]);
      }
      setDraft(null);
      router.refresh();
    } catch (err) {
      const msg = (err as { message?: string }).message ?? "Error";
      setError(msg.includes("categories_slug_key") ? "A category with this name already exists" : msg);
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: Category) {
    const n = productCounts[c.id] ?? 0;
    if (!confirm(n ? `"${c.name}" has ${n} products. Deleting it will leave those products without a category. Delete anyway?` : `Delete "${c.name}"?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) {
      alert(error.message);
      return;
    }
    await deleteImages(supabase, [storagePathFromUrl(c.image_url)]);
    router.refresh();
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="card overflow-hidden">
        {categories.length === 0 ? (
          <p className="p-10 text-center text-sm text-neutral-500">
            No categories yet. For example: Shirts, Jeans, Polo, Jackets.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-4 px-5 py-3">
                <div className="h-12 w-16 shrink-0 overflow-hidden rounded bg-sand">
                  {c.image_url && <img src={c.image_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    {c.name}{" "}
                    {!c.is_active && <span className="ml-1 rounded bg-neutral-200 px-1.5 py-0.5 text-xs text-neutral-600">Hidden</span>}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {productCounts[c.id] ?? 0} products · Order {c.sort_order}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setError("");
                    setDraft({ id: c.id, name: c.name, sort_order: String(c.sort_order), is_active: c.is_active, image_url: c.image_url, size_chart: c.size_chart ?? "" });
                  }}
                  className="p-2 text-neutral-500 hover:text-ink"
                  aria-label="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => remove(c)} className="p-2 text-neutral-400 hover:text-red-600" aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        {draft ? (
          <form onSubmit={save} className="card space-y-4 p-5">
            <h2 className="font-semibold">{draft.id ? "Edit category" : "New category"}</h2>
            <div>
              <label className="label" htmlFor="cname">Name *</label>
              <input id="cname" className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus />
            </div>
            <div>
              <label className="label">Picture</label>
              <label className="flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-md border-2 border-dashed border-neutral-300 text-sm text-neutral-500 hover:border-ink">
                {draft.preview || draft.image_url ? (
                  <img src={draft.preview ?? draft.image_url!} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex flex-col items-center gap-1">
                    <ImagePlus className="h-6 w-6" /> Choose a picture
                  </span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setDraft({ ...draft, file: f, preview: URL.createObjectURL(f) });
                  }}
                />
              </label>
            </div>
            <div>
              <label className="label" htmlFor="corder">Display order (lower comes first)</label>
              <input id="corder" type="number" className="input" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="cchart">Size chart</label>
              <textarea
                id="cchart"
                rows={7}
                className="input font-mono text-xs"
                value={draft.size_chart}
                onChange={(e) => setDraft({ ...draft, size_chart: e.target.value })}
                placeholder={"Size | Chest (in) | Length (in)\nS | 38 | 28\nM | 40 | 29\nL | 42 | 30\nMeasurements are of the garment, in inches."}
              />
              <p className="mt-1 text-xs text-neutral-500">
                One row per line, columns separated by &quot;|&quot;. The first line is the header. Lines without &quot;|&quot; show as notes. Shown as &quot;Size guide&quot; on every product in this category.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} />
              Show on website
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button className="btn-primary flex-1" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </button>
              <button type="button" className="btn-outline" onClick={() => setDraft(null)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => {
              setError("");
              setDraft({ ...EMPTY, sort_order: String(categories.length) });
            }}
            className="btn-primary w-full py-3"
          >
            <Plus className="h-4 w-4" /> New Category
          </button>
        )}
      </div>
    </div>
  );
}
