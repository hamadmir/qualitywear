"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, EyeOff, Loader2, MessageSquareReply, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Review } from "@/lib/types";
import { reviewPhotoUrl } from "@/lib/reviews";
import Stars from "@/components/shop/Stars";

type Row = Review & { products: { name: string; slug: string } | null; orders: { order_number: string } | null };

export default function ReviewManager({ reviews }: { reviews: Row[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [filter, setFilter] = useState<"pending" | "approved" | "all">(reviews.some((r) => !r.is_approved) ? "pending" : "all");

  async function act(id: string, fn: () => PromiseLike<{ error: unknown }>) {
    setBusy(id);
    const { error } = await fn();
    setBusy(null);
    if (error) alert((error as Error).message ?? "Something went wrong");
    router.refresh();
  }
  const supabase = createClient();

  const list = reviews.filter((r) => (filter === "all" ? true : filter === "pending" ? !r.is_approved : r.is_approved));

  return (
    <div className="mt-6">
      <div className="flex gap-2">
        {(["pending", "approved", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize ${filter === f ? "bg-ink text-white" : "border border-neutral-300 bg-white"}`}
          >
            {f} ({reviews.filter((r) => (f === "all" ? true : f === "pending" ? !r.is_approved : r.is_approved)).length})
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="card mt-4 p-8 text-center text-sm text-neutral-500">No reviews here yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {list.map((r) => (
            <li key={r.id} className={`card p-5 ${!r.is_approved ? "border-l-4 border-l-amber-400" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Stars value={r.rating} />
                    {!r.is_approved && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">Waiting</span>}
                  </div>
                  <p className="mt-1 text-sm">
                    <span className="font-semibold">{r.customer_name}</span>
                    {r.city && <span className="text-neutral-500"> · {r.city}</span>}
                    {r.products && (
                      <>
                        {" "}on{" "}
                        <Link href={`/product/${r.products.slug}`} target="_blank" className="font-medium text-brass hover:underline">
                          {r.products.name}
                        </Link>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {new Date(r.created_at).toLocaleString("en-GB", { timeZone: "Asia/Karachi" })}
                    {r.orders && <> · Order {r.orders.order_number}</>}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.is_approved ? (
                    <button
                      disabled={busy === r.id}
                      onClick={() => act(r.id, () => supabase.from("product_reviews").update({ is_approved: false }).eq("id", r.id))}
                      className="btn-outline px-3 py-1.5 text-xs"
                    >
                      <EyeOff className="h-3.5 w-3.5" /> Hide
                    </button>
                  ) : (
                    <button
                      disabled={busy === r.id}
                      onClick={() => act(r.id, () => supabase.from("product_reviews").update({ is_approved: true }).eq("id", r.id))}
                      className="btn bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700"
                    >
                      {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Approve
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setReplyFor(replyFor === r.id ? null : r.id);
                      setReply(r.admin_reply ?? "");
                    }}
                    className="btn-outline px-3 py-1.5 text-xs"
                  >
                    <MessageSquareReply className="h-3.5 w-3.5" /> Reply
                  </button>
                  <button
                    disabled={busy === r.id}
                    onClick={() => {
                      if (!confirm("Delete this review permanently? This cannot be undone.")) return;
                      act(r.id, async () => {
                        if (r.photos.length) await supabase.storage.from("review-photos").remove(r.photos);
                        return supabase.from("product_reviews").delete().eq("id", r.id);
                      });
                    }}
                    className="btn-outline px-3 py-1.5 text-xs text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
              {r.body && <p className="mt-3 whitespace-pre-line text-sm text-neutral-700">{r.body}</p>}
              {r.photos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.photos.map((p) => (
                    <a key={p} href={reviewPhotoUrl(p)} target="_blank" rel="noopener noreferrer" className="h-20 w-20 overflow-hidden rounded-lg bg-neutral-100">
                      <img src={reviewPhotoUrl(p)} alt="" className="h-full w-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
              {r.admin_reply && replyFor !== r.id && (
                <p className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm"><span className="font-semibold">Your reply:</span> {r.admin_reply}</p>
              )}
              {replyFor === r.id && (
                <div className="mt-3 flex gap-2">
                  <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} maxLength={1000} className="input flex-1" placeholder="Public reply shown under the review" />
                  <button
                    onClick={() =>
                      act(r.id, () => supabase.from("product_reviews").update({ admin_reply: reply.trim() || null }).eq("id", r.id)).then(() => setReplyFor(null))
                    }
                    className="btn bg-ink px-4 text-xs text-white"
                  >
                    Save
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
