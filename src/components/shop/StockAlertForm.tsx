"use client";

import { useState } from "react";
import { BellRing, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getPushSubscription, pushSupported } from "@/lib/push";

export default function StockAlertForm({ variantId, label }: { variantId: string; label: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      let sub: Awaited<ReturnType<typeof getPushSubscription>> = null;
      if (pushSupported()) {
        try {
          sub = await getPushSubscription();
        } catch {
          sub = null;
        }
      }
      const { error } = await createClient().rpc("create_stock_alert", {
        p_variant_id: variantId,
        p_name: name,
        p_phone: phone,
        p_endpoint: sub?.endpoint ?? null,
        p_p256dh: sub?.p256dh ?? null,
        p_auth: sub?.auth ?? null,
      });
      if (error) throw new Error(error.message);
      setDone(true);
    } catch (err) {
      setError((err as Error).message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="animate-fade-up mt-6 flex items-start gap-3 rounded-2xl bg-green-50 p-4 text-sm text-green-800">
        <Check className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          You&apos;re on the list! We&apos;ll let you know on WhatsApp{pushSupported() ? " and with a notification" : ""} as soon as {label} is back.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="animate-fade-up mt-6 rounded-2xl border border-amber/40 bg-amber/10 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <BellRing className="h-4 w-4 text-brass" /> {label} is sold out. Get notified when it&apos;s back.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.2fr_auto]">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="h-11 rounded-full border border-black/10 bg-white px-4 text-sm outline-none focus:border-ink" />
        <input
          required
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="WhatsApp number (03xx…)"
          className="h-11 rounded-full border border-black/10 bg-white px-4 text-sm outline-none focus:border-ink"
        />
        <button disabled={busy} className="flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Notify me"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </form>
  );
}
