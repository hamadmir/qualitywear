"use client";

import Link from "next/link";
import { ArrowUpRight, Banknote, Minus, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";
import { useCart } from "@/components/shop/CartProvider";
import { rs } from "@/lib/format";

export default function CartPage() {
  const { items, ready, count, subtotal, deliveryCharge, total, setQuantity, remove, settings } = useCart();

  if (!ready) return <div className="mx-auto min-h-[50vh] max-w-6xl px-4 py-16" />;

  if (items.length === 0) {
    return (
      <div className="px-3 pt-6 sm:px-5">
        <div className="animate-fade-up mx-auto max-w-3xl rounded-[28px] bg-white px-6 py-20 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ivory">
            <ShoppingBag className="h-7 w-7" />
          </span>
          <h1 className="mt-6 font-display text-4xl font-bold">
            Your cart is <span className="font-accent text-neutral-400">empty.</span>
          </h1>
          <p className="mt-3 text-neutral-600">Find something you love in our latest collection.</p>
          <Link href="/shop" className="mt-8 inline-flex items-center gap-3 rounded-full bg-ink py-2 pl-6 pr-2 font-semibold text-white">
            Start shopping
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber text-ink">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </div>
    );
  }

  const freeAbove = settings.free_delivery_above != null ? Number(settings.free_delivery_above) : null;
  const remaining = freeAbove != null ? freeAbove - subtotal : 0;
  const progress = freeAbove ? Math.min(100, (subtotal / freeAbove) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-5">
      <div className="animate-fade-up">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
          <span className="h-1.5 w-1.5 rounded-full bg-amber" /> {count} {count === 1 ? "item" : "items"}
        </p>
        <h1 className="mt-3 font-display text-5xl font-bold">
          Your <span className="font-accent text-neutral-400">cart.</span>
        </h1>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {freeAbove != null && (
            <div className="rounded-[20px] border border-black/5 bg-white p-5">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Truck className="h-4 w-4 text-brass" />
                {remaining > 0 ? (
                  <>
                    Add <span className="font-bold">{rs(remaining)}</span> more for free delivery
                  </>
                ) : (
                  <>You&apos;ve unlocked free delivery!</>
                )}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ivory">
                <div className="h-full rounded-full bg-amber transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          {items.map((item) => (
            <div key={item.variantId} className="animate-fade-up flex gap-4 rounded-[22px] border border-black/5 bg-white p-3">
              <Link href={`/product/${item.slug}`} className="h-32 w-24 shrink-0 overflow-hidden rounded-2xl bg-sand">
                {item.image && <img src={item.image} alt={item.name} className="h-full w-full object-cover" />}
              </Link>
              <div className="flex flex-1 flex-col py-1 pr-2">
                <div className="flex justify-between gap-3">
                  <div>
                    <Link href={`/product/${item.slug}`} className="font-semibold tracking-tight hover:underline">
                      {item.name}
                    </Link>
                    <p className="mt-1 text-sm text-neutral-500">
                      Size {item.size}
                      {item.color && ` · ${item.color}`}
                    </p>
                  </div>
                  <p className="font-bold">{rs(item.price * item.quantity)}</p>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex h-10 items-center rounded-full border border-black/10">
                    <button className="px-3" onClick={() => setQuantity(item.variantId, item.quantity - 1)} aria-label="Decrease quantity">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      className="px-3 disabled:opacity-30"
                      onClick={() => setQuantity(item.variantId, item.quantity + 1)}
                      disabled={item.quantity >= item.maxStock}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => remove(item.variantId)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-neutral-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="h-fit rounded-[24px] bg-ink p-6 text-white lg:sticky lg:top-28">
          <h2 className="text-lg font-bold">Order summary</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-white/60">Subtotal</dt>
              <dd>{rs(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/60">Delivery</dt>
              <dd>{deliveryCharge === 0 ? <span className="text-amber">Free</span> : rs(deliveryCharge)}</dd>
            </div>
            <div className="flex justify-between border-t border-white/15 pt-4 text-lg font-bold">
              <dt>Total</dt>
              <dd>{rs(total)}</dd>
            </div>
          </dl>
          <Link
            href="/checkout"
            className="mt-6 flex h-12 items-center justify-center gap-2 rounded-full bg-amber font-semibold text-ink transition hover:brightness-95"
          >
            Proceed to checkout <ArrowUpRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-white/60">
            <Banknote className="h-4 w-4" /> Pay by bank, JazzCash or Easypaisa
          </p>
          <Link href="/shop" className="mt-4 block text-center text-sm text-white/70 hover:text-white">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
