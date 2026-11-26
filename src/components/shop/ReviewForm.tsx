"use client";

import { useState } from "react";
import { Camera, Check, Loader2, Star, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image-upload";
import { reviewFolder } from "@/lib/reviews";

export default function ReviewForm({
  orderNo,
  token,
  productId,
  productName,
  initialRating,
  onDone,
}: {
  orderNo: string;
  token: string;
  productId: string;
  productName: string;
  initialRating?: number;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(initialRating ?? 0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return setError("Please tap the stars to rate this item.");
    setBusy(true);
    setError("");
    const supabase = createClient();
    try {
      const folder = await reviewFolder(token);
      const paths: string[] = [];
      for (const f of files.slice(0, 4)) {
        const blob = await compressImage(f, 1600, 0.82);
        const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
        const path = `${folder}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("review-photos").upload(path, blob, { contentType: blob.type || "image/jpeg" });
        if (upErr) throw new Error("A photo couldn't be uploaded. Please try a different picture.");
        paths.push(path);
      }
      const { error } = await supabase.rpc("submit_review", {
        p_order_number: orderNo,
        p_token: token,
        p_product_id: productId,
        p_rating: rating,
        p_body: body,
        p_photos: paths,
      });
      if (error) throw new Error(error.message);
      setDone(true);
      setTimeout(onDone, 1600);
    } catch (err) {
      setError((err as Error).message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-6" onClick={onDone}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="animate-fade-up max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-white p-6 sm:rounded-[28px] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brass">Write a review</p>
            <h3 className="mt-1 font-display text-2xl font-bold">{productName}</h3>
          </div>
          <button type="button" onClick={onDone} className="rounded-full p-2 hover:bg-neutral-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="mt-8 flex flex-col items-center py-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber">
              <Check className="h-7 w-7" strokeWidth={3} />
            </span>
            <p className="mt-4 text-lg font-semibold">Thank you for your review!</p>
            <p className="mt-1 text-sm text-neutral-500">It will appear on the product page once we&apos;ve checked it.</p>
          </div>
        ) : (
          <>
            <div className="mt-6 flex justify-center gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onMouseEnter={() => setHover(i)}
                  onClick={() => setRating(i)}
                  className="p-1 transition hover:scale-110"
                  aria-label={`${i} star${i > 1 ? "s" : ""}`}
                >
                  <Star className={`h-9 w-9 ${(hover || rating) >= i ? "fill-amber text-amber" : "text-neutral-300"}`} />
                </button>
              ))}
            </div>
            <p className="mt-1 text-center text-sm text-neutral-500">
              {["Tap to rate", "Poor", "Fair", "Good", "Very good", "Excellent"][hover || rating]}
            </p>

            <label className="mt-6 block text-sm font-semibold" htmlFor="rv-body">Your review</label>
            <textarea
              id="rv-body"
              rows={4}
              maxLength={2000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="How is the fabric, fit and quality? Would you recommend it?"
              className="mt-2 w-full rounded-2xl border border-black/10 bg-ivory/60 p-4 text-sm outline-none focus:border-ink focus:bg-white"
            />

            <p className="mt-4 text-sm font-semibold">Add photos <span className="font-normal text-neutral-400">(optional, up to 4)</span></p>
            <div className="mt-2 flex flex-wrap gap-2">
              {files.map((f, i) => (
                <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl bg-sand">
                  <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                    aria-label="Remove photo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {files.length < 4 && (
                <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-black/15 text-xs text-neutral-500 hover:border-ink">
                  <Camera className="h-5 w-5" /> Add
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => setFiles((x) => [...x, ...Array.from(e.target.files ?? [])].slice(0, 4))}
                  />
                </label>
              )}
            </div>

            {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button disabled={busy} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink font-semibold text-white disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit review"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
