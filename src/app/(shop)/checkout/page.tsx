"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Lock, MessageCircle, Tag, X } from "lucide-react";
import { orderChatUrl, saveOrder } from "@/lib/my-orders";
import { trackBeginCheckout } from "@/lib/analytics";
import { useCart } from "@/components/shop/CartProvider";
import { createClient } from "@/lib/supabase/client";
import { rs } from "@/lib/format";

const CITIES = [
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar",
  "Quetta", "Sialkot", "Gujranwala", "Hyderabad", "Bahawalpur", "Sargodha", "Sukkur",
];

const field = "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-ink focus:ring-4 focus:ring-black/5";

export default function CheckoutPage() {
  const { items, ready, subtotal, deliveryCharge, total, clear } = useCart();
  const tracked = useRef(false);
  useEffect(() => {
    if (!ready || tracked.current || items.length === 0) return;
    tracked.current = true;
    trackBeginCheckout(
      items.map((i) => ({ id: i.productId, name: i.name, price: i.price, quantity: i.quantity, variant: i.size })),
      subtotal
    );
  }, [ready, items, subtotal]);
  const router = useRouter();
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", city: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState("");
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const discount = coupon ? Math.min(coupon.discount, subtotal) : 0;
  const grandTotal = total - discount;

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setCheckingCoupon(true);
    setCouponMsg("");
    const { data, error } = await createClient().rpc("validate_coupon", { p_code: code, p_subtotal: subtotal });
    setCheckingCoupon(false);
    const r = data?.[0];
    if (error || !r) {
      setCouponMsg("We couldn't check this coupon. Please try again.");
      return;
    }
    if (!r.valid) {
      setCoupon(null);
      setCouponMsg(r.message);
      return;
    }
    setCoupon({ code: r.code, discount: Number(r.discount) });
    setCouponInput("");
  }

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const phoneDigits = form.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 13) {
      setError("Please enter a valid phone number, e.g. 03001234567.");
      return;
    }
    setSubmitting(true);
    const { data, error: rpcError } = await createClient().rpc("place_order", {
      p_customer_name: form.name,
      p_phone: form.phone,
      p_email: form.email,
      p_address: form.address,
      p_city: form.city,
      p_notes: form.notes,
      p_items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
      p_coupon: coupon?.code ?? null,
    });
    if (rpcError || !data?.[0]) {
      setSubmitting(false);
      setError(rpcError?.message ?? "We couldn't place your order. Please try again.");
      return;
    }
    const orderNo = data[0].order_number as string;
    const token = data[0].access_token as string;
    saveOrder(orderNo, token);
    clear();
    router.push(`${orderChatUrl(orderNo, token)}&new=1`);
  }

  if (!ready) return <div className="mx-auto min-h-[50vh] max-w-6xl px-4 py-16" />;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-4xl font-bold">Your cart is empty.</h1>
        <Link href="/shop" className="btn-primary mt-6 rounded-full px-6">Start shopping</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-5">
      <div className="animate-fade-up">
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em]">
          <span className="text-neutral-400">Cart</span>
          <span className="h-px w-6 bg-black/20" />
          <span>Checkout</span>
          <span className="h-px w-6 bg-black/20" />
          <span className="text-neutral-400">Done</span>
        </div>
        <h1 className="mt-4 font-display text-5xl font-bold">
          Almost <span className="font-accent text-neutral-400">there.</span>
        </h1>
      </div>

      <form onSubmit={onSubmit} className="mt-8 grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="animate-fade-up delay-100 space-y-6">
          <section className="rounded-[24px] border border-black/5 bg-white p-6 sm:p-8">
            <h2 className="flex items-center gap-3 text-lg font-bold">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs text-white">1</span>
              Delivery details
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="name">Full name *</label>
                <input id="name" required className={field} value={form.name} onChange={update("name")} autoComplete="name" />
              </div>
              <div>
                <label className="label" htmlFor="phone">Phone number *</label>
                <input id="phone" required type="tel" inputMode="tel" placeholder="03001234567" className={field} value={form.phone} onChange={update("phone")} autoComplete="tel" />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="email">Email (optional)</label>
                <input id="email" type="email" className={field} value={form.email} onChange={update("email")} autoComplete="email" />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="address">Full address *</label>
                <textarea id="address" required rows={3} placeholder="House number, street, area" className={field} value={form.address} onChange={update("address")} autoComplete="street-address" />
              </div>
              <div>
                <label className="label" htmlFor="city">City *</label>
                <input id="city" required list="cities" className={field} value={form.city} onChange={update("city")} autoComplete="address-level2" />
                <datalist id="cities">
                  {CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="label" htmlFor="notes">Order notes (optional)</label>
                <input id="notes" className={field} placeholder="e.g. call before delivery" value={form.notes} onChange={update("notes")} />
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-black/5 bg-white p-6 sm:p-8">
            <h2 className="flex items-center gap-3 text-lg font-bold">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs text-white">2</span>
              Payment
            </h2>
            <div className="mt-5 rounded-2xl border-2 border-ink p-4">
              <div className="flex items-center gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="font-semibold">Bank transfer · JazzCash · Easypaisa</p>
                  <p className="text-sm text-neutral-500">Pay after we confirm your order in chat</p>
                </div>
                <Check className="h-5 w-5" />
              </div>
              <ol className="mt-4 grid gap-2 text-sm text-neutral-600 sm:grid-cols-2">
                {[
                  "Place your order (no payment now)",
                  "Your order chat opens instantly",
                  "We send payment details in the chat",
                  "Pay, share the screenshot, we ship",
                ].map((t, i) => (
                  <li key={t} className="flex items-start gap-2 rounded-xl bg-ivory px-3 py-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">{i + 1}</span>
                    {t}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>

        <div className="animate-fade-up delay-200 h-fit rounded-[24px] bg-ink p-6 text-white lg:sticky lg:top-28">
          <h2 className="text-lg font-bold">Your order</h2>
          <ul className="mt-5 space-y-4">
            {items.map((i) => (
              <li key={i.variantId} className="flex gap-3 text-sm">
                <div className="relative h-16 w-13 shrink-0 overflow-hidden rounded-xl bg-white/10">
                  {i.image && <img src={i.image} alt="" className="h-full w-full object-cover" />}
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber text-[10px] font-bold text-ink">
                    {i.quantity}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">{i.name}</p>
                  <p className="text-white/50">
                    Size {i.size}
                    {i.color && ` · ${i.color}`}
                  </p>
                </div>
                <p>{rs(i.price * i.quantity)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-6 border-t border-white/15 pt-5">
            {coupon ? (
              <div className="flex items-center justify-between rounded-2xl bg-amber/15 px-4 py-3 text-sm">
                <span className="flex items-center gap-2 font-semibold text-amber">
                  <Tag className="h-4 w-4" /> {coupon.code}
                </span>
                <button type="button" onClick={() => setCoupon(null)} className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Remove coupon">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyCoupon();
                    }
                  }}
                  placeholder="Coupon code"
                  className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm uppercase tracking-wider text-white placeholder:normal-case placeholder:tracking-normal placeholder:text-white/40 outline-none focus:border-amber"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={checkingCoupon || !couponInput.trim()}
                  className="rounded-full bg-white px-5 text-sm font-semibold text-ink disabled:opacity-50"
                >
                  {checkingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </button>
              </div>
            )}
            {couponMsg && <p className="mt-2 text-xs text-red-300">{couponMsg}</p>}
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-white/60">Subtotal</dt>
              <dd>{rs(subtotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-amber">
                <dt>Discount ({coupon?.code})</dt>
                <dd>−{rs(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-white/60">Delivery</dt>
              <dd>{deliveryCharge === 0 ? <span className="text-amber">Free</span> : rs(deliveryCharge)}</dd>
            </div>
            <div className="flex justify-between border-t border-white/15 pt-4 text-lg font-bold">
              <dt>Total</dt>
              <dd>{rs(grandTotal)}</dd>
            </div>
          </dl>
          {error && <p className="mt-4 rounded-2xl bg-red-500/15 p-3 text-sm text-red-200">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-amber font-semibold text-ink transition hover:brightness-95 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Place order · {rs(grandTotal)}
          </button>
          <p className="mt-3 text-center text-xs text-white/50">Nothing to pay now. We&apos;ll share payment details in your order chat.</p>
        </div>
      </form>
    </div>
  );
}
