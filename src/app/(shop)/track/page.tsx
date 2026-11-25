"use client";

import { useState } from "react";
import { Check, Loader2, PackageSearch, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, rs, STATUS_LABELS } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import PageHero from "@/components/ui/PageHero";

type Tracked = {
  order_number: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  customer_name: string;
  city: string;
  items: { product_name: string; size: string | null; color: string | null; quantity: number; line_total: number; image_url: string | null }[];
};

const STEPS: OrderStatus[] = ["pending", "confirmed", "shipped", "delivered"];
const STEP_TEXT: Record<string, string> = {
  pending: "We've received your order",
  confirmed: "Your order is confirmed",
  shipped: "On its way to you",
  delivered: "Delivered. Enjoy!",
};

const field = "w-full rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-amber";

export default function TrackPage() {
  const [orderNo, setOrderNo] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Tracked | null>(null);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    const { data, error } = await createClient().rpc("track_order", { p_order_number: orderNo, p_phone: phone });
    setLoading(false);
    if (error) return setError("Something went wrong. Please try again.");
    if (!data || data.length === 0) return setError("We couldn't find an order with that number and phone.");
    setResult(data[0] as Tracked);
  }

  const stepIndex = result ? STEPS.indexOf(result.status) : -1;

  return (
    <div className="px-3 sm:px-5">
      <PageHero
        eyebrow="Order tracking"
        title="Where's my"
        accent="order?"
        subtitle="Enter your order number and the phone number you used at checkout."
      >
        <form onSubmit={onSubmit} className="grid max-w-3xl gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input required placeholder="Order number, e.g. QW-1001" className={field} value={orderNo} onChange={(e) => setOrderNo(e.target.value)} />
          <input required type="tel" placeholder="Phone number" className={field} value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button className="flex items-center justify-center gap-2 rounded-full bg-amber px-6 py-3 font-semibold text-ink" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageSearch className="h-4 w-4" />} Track
          </button>
        </form>
      </PageHero>

      <div className="mx-auto max-w-3xl">
        {error && <p className="animate-fade-up mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        {result && (
          <div className="animate-fade-up mt-6 rounded-[28px] border border-black/5 bg-white p-6 sm:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-2xl font-bold">{result.order_number}</p>
              <p className="text-sm text-neutral-500">Placed {formatDate(result.created_at)}</p>
            </div>

            {result.status === "cancelled" ? (
              <p className="mt-6 flex items-center gap-2 rounded-2xl bg-red-50 p-4 font-semibold text-red-700">
                <X className="h-5 w-5" /> This order has been cancelled.
              </p>
            ) : (
              <>
                <p className="mt-2 text-lg font-semibold text-brass">{STEP_TEXT[result.status]}</p>
                <ol className="mt-8 grid grid-cols-4">
                  {STEPS.map((s, i) => {
                    const done = i <= stepIndex;
                    return (
                      <li key={s} className="relative text-center">
                        {i > 0 && (
                          <span className={`absolute right-1/2 top-4 h-0.5 w-full ${i <= stepIndex ? "bg-amber" : "bg-neutral-200"}`} />
                        )}
                        <span
                          className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                            done ? "bg-amber text-ink" : "bg-neutral-100 text-neutral-400"
                          }`}
                        >
                          {done ? <Check className="h-4 w-4" /> : i + 1}
                        </span>
                        <p className={`mt-2 text-xs sm:text-sm ${done ? "font-semibold" : "text-neutral-400"}`}>{STATUS_LABELS[s]}</p>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}

            <ul className="mt-8 space-y-3 border-t border-black/5 pt-6">
              {result.items.map((it, idx) => (
                <li key={idx} className="flex items-center gap-3 text-sm">
                  <div className="h-16 w-13 shrink-0 overflow-hidden rounded-xl bg-sand">
                    {it.image_url && <img src={it.image_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{it.product_name}</p>
                    <p className="text-neutral-500">
                      Size {it.size}
                      {it.color && ` · ${it.color}`} · Qty {it.quantity}
                    </p>
                  </div>
                  <p className="font-medium">{rs(it.line_total)}</p>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-right text-lg font-bold">Total {rs(result.total)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
