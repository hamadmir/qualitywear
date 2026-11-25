"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Film, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image-upload";
import type { StoreMedia } from "@/lib/types";

const BUCKET = "store-media";
const MAX_VIDEO_MB = 50;

export default function StoreMediaManager({ media }: { media: StoreMedia[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [captions, setCaptions] = useState<Record<string, string>>(
    Object.fromEntries(media.map((m) => [m.id, m.caption ?? ""]))
  );

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    const supabase = createClient();
    const list = Array.from(files);
    let order = media.length;
    try {
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        const isVideo = file.type.startsWith("video/");
        const isImage = file.type.startsWith("image/");
        if (!isVideo && !isImage) continue;
        if (isVideo && file.size > MAX_VIDEO_MB * 1024 * 1024) {
          throw new Error(`"${file.name}" is larger than ${MAX_VIDEO_MB} MB. Please upload a shorter or compressed video.`);
        }
        setStatus(`Uploading ${i + 1} of ${list.length}…`);
        const blob = isImage ? await compressImage(file, 2000, 0.85) : file;
        const ext = isImage
          ? blob.type === "image/webp"
            ? "webp"
            : (file.name.split(".").pop() || "jpg").toLowerCase()
          : (file.name.split(".").pop() || "mp4").toLowerCase();
        const path = `${isVideo ? "videos" : "photos"}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, {
          contentType: blob.type || file.type,
          cacheControl: "31536000",
        });
        if (upErr) throw upErr;
        const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        const { error: dbErr } = await supabase
          .from("store_media")
          .insert({ media_type: isVideo ? "video" : "image", url, storage_path: path, sort_order: order++ });
        if (dbErr) throw dbErr;
      }
      router.refresh();
    } catch (err) {
      setError((err as { message?: string }).message ?? "Upload failed");
    } finally {
      setBusy(false);
      setStatus("");
      if (input.current) input.current.value = "";
    }
  }

  async function saveCaption(m: StoreMedia) {
    const caption = (captions[m.id] ?? "").trim() || null;
    if (caption === (m.caption ?? null)) return;
    await createClient().from("store_media").update({ caption }).eq("id", m.id);
    router.refresh();
  }

  async function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= media.length) return;
    const a = media[index];
    const b = media[j];
    const supabase = createClient();
    await Promise.all([
      supabase.from("store_media").update({ sort_order: j }).eq("id", a.id),
      supabase.from("store_media").update({ sort_order: index }).eq("id", b.id),
    ]);
    router.refresh();
  }

  async function remove(m: StoreMedia) {
    if (!confirm("Delete this item from the store gallery?")) return;
    const supabase = createClient();
    await supabase.from("store_media").delete().eq("id", m.id);
    if (m.storage_path) await supabase.storage.from(BUCKET).remove([m.storage_path]);
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-6">
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 bg-white px-6 py-10 text-neutral-600 transition hover:border-ink hover:text-ink disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-7 w-7 animate-spin" /> : <Upload className="h-7 w-7" />}
        <span className="font-semibold">{busy ? status || "Uploading…" : "Upload photos or videos"}</span>
        <span className="text-xs text-neutral-500">JPG, PNG, WebP, MP4 or MOV · videos up to {MAX_VIDEO_MB} MB · select several at once</span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*,video/mp4,video/webm,video/quicktime"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {media.length === 0 ? (
        <div className="card p-10 text-center text-sm text-neutral-500">
          No photos or videos yet. Upload pictures of your shop front, displays and interior.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {media.map((m, i) => (
            <div key={m.id} className="card overflow-hidden">
              <div className="relative aspect-[4/3] bg-neutral-900">
                {m.media_type === "video" ? (
                  <video src={m.url} muted controls preload="metadata" className="h-full w-full object-cover" />
                ) : (
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                )}
                <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {m.media_type === "video" ? <Film className="h-3 w-3" /> : <ImagePlus className="h-3 w-3" />}
                  {i === 0 && m.media_type === "image" ? "Banner" : m.media_type === "video" ? "Video" : `#${i + 1}`}
                </span>
              </div>
              <div className="space-y-2 p-3">
                <input
                  className="input"
                  placeholder="Caption (optional)"
                  value={captions[m.id] ?? ""}
                  onChange={(e) => setCaptions((c) => ({ ...c, [m.id]: e.target.value }))}
                  onBlur={() => saveCaption(m)}
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded-md p-2 hover:bg-neutral-100 disabled:opacity-30" aria-label="Move earlier">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <button onClick={() => move(i, 1)} disabled={i === media.length - 1} className="rounded-md p-2 hover:bg-neutral-100 disabled:opacity-30" aria-label="Move later">
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                  <button onClick={() => remove(m)} className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
