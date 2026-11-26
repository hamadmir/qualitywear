import { BadgeCheck, MessageSquareQuote } from "lucide-react";
import type { Review } from "@/lib/types";
import { reviewPhotoUrl, summarize } from "@/lib/reviews";
import Stars from "./Stars";

export default function ProductReviews({ reviews }: { reviews: Review[] }) {
  const { count, avg, dist } = summarize(reviews.map((r) => r.rating));
  return (
    <section id="reviews" className="relative z-10 clear-both scroll-mt-28 pt-20">
      <h2 className="font-display text-4xl font-bold">
        Customer <span className="font-accent text-neutral-400">reviews.</span>
      </h2>
      {count === 0 ? (
        <div className="mt-6 rounded-[24px] border border-dashed border-black/15 bg-white/60 p-8 text-center">
          <MessageSquareQuote className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-3 font-semibold">No reviews yet</p>
          <p className="mt-1 text-sm text-neutral-500">Bought this item? You can leave a review from your order page once it ships.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
          <div className="h-fit rounded-[24px] bg-ink p-6 text-white">
            <p className="font-display text-6xl font-bold">{avg.toFixed(1)}</p>
            <Stars value={avg} size={20} className="mt-2" />
            <p className="mt-2 text-sm text-white/60">Based on {count} verified {count === 1 ? "review" : "reviews"}</p>
            <ul className="mt-5 space-y-1.5 text-sm">
              {dist.map((d) => (
                <li key={d.stars} className="flex items-center gap-3">
                  <span className="w-6 text-white/70">{d.stars}★</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                    <span className="block h-full rounded-full bg-amber" style={{ width: `${count ? (d.n / count) * 100 : 0}%` }} />
                  </span>
                  <span className="w-6 text-right text-white/60">{d.n}</span>
                </li>
              ))}
            </ul>
          </div>
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-[24px] border border-black/5 bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sand font-bold">
                      {r.customer_name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="font-semibold">
                        {r.customer_name}
                        {r.city && <span className="font-normal text-neutral-500"> · {r.city}</span>}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-green-700">
                        <BadgeCheck className="h-3.5 w-3.5" /> Verified purchase
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Stars value={r.rating} />
                    <p className="text-xs text-neutral-400">
                      {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" })}
                    </p>
                  </div>
                </div>
                {r.body && <p className="mt-4 whitespace-pre-line leading-relaxed text-neutral-700">{r.body}</p>}
                {r.photos.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {r.photos.map((p) => (
                      <a key={p} href={reviewPhotoUrl(p)} target="_blank" rel="noopener noreferrer" className="h-24 w-24 overflow-hidden rounded-xl bg-sand">
                        <img src={reviewPhotoUrl(p)} alt={`Customer photo from ${r.customer_name}`} loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />
                      </a>
                    ))}
                  </div>
                )}
                {r.admin_reply && (
                  <div className="mt-4 rounded-2xl bg-ivory p-4 text-sm">
                    <p className="font-semibold text-brass">Reply from Quality Wear</p>
                    <p className="mt-1 whitespace-pre-line text-neutral-700">{r.admin_reply}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
