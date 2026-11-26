"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, Loader2, Paperclip, Send, Store, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image-upload";
import { rs, STATUS_LABELS, whatsappLink } from "@/lib/format";
import { saveOrder } from "@/lib/my-orders";
import type { OrderStatus } from "@/lib/types";
import { WhatsAppIcon } from "./WhatsAppButton";

type ChatMessage = { id: string; sender: "customer" | "admin" | "system"; body: string; has_attachment: boolean; created_at: string };
type ChatOrder = {
  order_number: string;
  status: OrderStatus;
  payment_status: "unpaid" | "paid" | "refunded";
  subtotal: number;
  discount: number;
  coupon_code: string | null;
  delivery_charge: number;
  total: number;
  customer_name: string;
  city: string;
  created_at: string;
  items: { product_name: string; size: string | null; color: string | null; quantity: number; line_total: number; image_url: string | null }[];
};

const STEPS = [
  { key: "placed", label: "Order placed" },
  { key: "paid", label: "Payment" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

function stepIndex(o: ChatOrder) {
  if (o.status === "delivered") return 3;
  if (o.status === "shipped") return 2;
  if (o.payment_status === "paid" || o.status === "confirmed") return 1;
  return 0;
}

function time(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short", timeZone: "Asia/Karachi" });
}

export default function OrderChat({
  orderNo,
  token,
  justPlaced,
  whatsapp,
}: {
  orderNo: string;
  token: string;
  justPlaced: boolean;
  whatsapp: string | null;
}) {
  const [order, setOrder] = useState<ChatOrder | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<"loading" | "ok" | "notfound">("loading");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showWelcome, setShowWelcome] = useState(justPlaced);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastCount = useRef(0);

  const load = useCallback(async () => {
    if (!token) return setState("notfound");
    const { data, error } = await createClient().rpc("get_order_chat", { p_order_number: orderNo, p_token: token });
    if (error) return;
    if (!data) return setState("notfound");
    setOrder(data.order as ChatOrder);
    setMessages(data.messages as ChatMessage[]);
    setState("ok");
  }, [orderNo, token]);

  useEffect(() => {
    if (token) saveOrder(orderNo, token);
    load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 5000);
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load, orderNo, token]);

  useEffect(() => {
    if (messages.length !== lastCount.current) {
      lastCount.current = messages.length;
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (sending || (!text.trim() && !file)) return;
    setSending(true);
    setError("");
    const supabase = createClient();
    try {
      let path: string | null = null;
      if (file) {
        const isImage = file.type.startsWith("image/") && file.type !== "image/heic";
        const blob = isImage ? await compressImage(file, 1800, 0.85) : file;
        const ext = blob.type === "image/webp" ? "webp" : (file.name.split(".").pop() || "jpg").toLowerCase();
        path = `${token}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, blob, { contentType: blob.type || file.type });
        if (upErr) throw new Error("The screenshot couldn't be uploaded. Please try a smaller image.");
      }
      const { error: sendErr } = await supabase.rpc("send_order_message", {
        p_order_number: orderNo,
        p_token: token,
        p_body: text,
        p_attachment_path: path,
      });
      if (sendErr) throw new Error(sendErr.message);
      setText("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (err) {
      setError((err as Error).message || "Message not sent. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (state === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (state === "notfound" || !order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-4xl font-bold">We couldn&apos;t open this order.</h1>
        <p className="mt-3 text-neutral-600">The link may be incomplete. Find your order with your order number and phone.</p>
        <Link href="/track" className="btn-primary mt-8 rounded-full px-6">Find my order</Link>
      </div>
    );
  }

  const step = order.status === "cancelled" ? -1 : stepIndex(order);
  const wa = whatsappLink(whatsapp, `Hi Quality Wear! About my order ${order.order_number}.`);

  return (
    <div className="mx-auto max-w-6xl px-3 pb-6 pt-6 sm:px-5">
      {showWelcome && (
        <div className="animate-fade-up relative mb-4 overflow-hidden rounded-[24px] bg-ink p-6 text-white sm:p-8">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-amber/25 blur-3xl" />
          <button onClick={() => setShowWelcome(false)} className="absolute right-4 top-4 rounded-full p-1.5 text-white/60 hover:bg-white/10" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
          <div className="relative flex flex-wrap items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber text-ink">
              <Check className="h-6 w-6" strokeWidth={3} />
            </span>
            <div className="flex-1">
              <p className="font-display text-2xl font-bold">
                Order placed. <span className="font-accent text-amber">Let&apos;s chat.</span>
              </p>
              <p className="mt-1 text-sm text-white/70">
                We&apos;ll send payment details in the chat below. This page is saved on your device, and you can also find it anytime under Track Order.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Chat */}
        <section className="flex h-[calc(100dvh-140px)] min-h-[520px] flex-col overflow-hidden rounded-[24px] border border-black/5 bg-white lg:h-[calc(100dvh-120px)]">
          <header className="flex items-center gap-3 border-b border-black/5 px-5 py-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-sm font-extrabold text-amber">QW</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Quality Wear</p>
              <p className="flex items-center gap-1.5 text-xs text-neutral-500">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Order {order.order_number} · usually replies within hours
              </p>
            </div>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="hidden items-center gap-1.5 rounded-full border border-[#25D366]/40 px-3 py-1.5 text-xs font-semibold text-[#128C7E] sm:flex">
                <WhatsAppIcon className="h-4 w-4" /> WhatsApp
              </a>
            )}
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-ivory/60 px-4 py-5 sm:px-6">
            {messages.map((m) =>
              m.sender === "system" ? (
                <div key={m.id} className="animate-fade-in mx-auto max-w-md rounded-2xl border border-amber/30 bg-amber/10 px-4 py-3 text-center text-sm text-ink">
                  <p className="whitespace-pre-line">{m.body}</p>
                  <p className="mt-1 text-[11px] text-neutral-500">{time(m.created_at)}</p>
                </div>
              ) : (
                <div key={m.id} className={`animate-fade-in flex ${m.sender === "customer" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      m.sender === "customer" ? "rounded-br-md bg-ink text-white" : "rounded-bl-md border border-black/5 bg-white"
                    }`}
                  >
                    {m.sender === "admin" && <p className="mb-0.5 text-[11px] font-semibold text-brass">Quality Wear</p>}
                    {m.has_attachment && (
                      <p className={`mb-1 flex items-center gap-1.5 text-xs font-semibold ${m.sender === "customer" ? "text-amber" : "text-brass"}`}>
                        <Paperclip className="h-3.5 w-3.5" /> Payment screenshot sent
                      </p>
                    )}
                    {m.body && <p className="whitespace-pre-line break-words">{m.body}</p>}
                    <p className={`mt-1 text-right text-[10px] ${m.sender === "customer" ? "text-white/50" : "text-neutral-400"}`}>{time(m.created_at)}</p>
                  </div>
                </div>
              )
            )}
          </div>

          {order.status !== "cancelled" && order.status !== "delivered" ? (
            <form onSubmit={send} className="border-t border-black/5 p-3 sm:p-4">
              {file && (
                <div className="mb-2 flex items-center gap-2 rounded-xl bg-ivory px-3 py-2 text-xs">
                  <Paperclip className="h-3.5 w-3.5" />
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <button type="button" onClick={() => setFile(null)} className="text-neutral-500 hover:text-ink" aria-label="Remove attachment">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {error && <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 text-neutral-600 hover:border-ink hover:text-ink"
                  aria-label="Attach payment screenshot"
                  title="Attach payment screenshot"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <textarea
                  rows={1}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={file ? "Add a note (optional)…" : "Type a message…"}
                  className="max-h-32 min-h-11 flex-1 resize-none rounded-3xl border border-black/10 bg-ivory/60 px-4 py-3 text-sm outline-none focus:border-ink focus:bg-white"
                />
                <button
                  disabled={sending || (!text.trim() && !file)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-white transition hover:bg-black disabled:opacity-40"
                  aria-label="Send"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-2 px-1 text-[11px] text-neutral-400">Paid already? Tap the clip to send your payment screenshot.</p>
            </form>
          ) : (
            <p className="border-t border-black/5 p-4 text-center text-sm text-neutral-500">
              This order is {order.status}. {wa ? "For anything else, message us on WhatsApp." : ""}
            </p>
          )}
        </section>

        {/* Order summary */}
        <aside className="space-y-4">
          <div className="rounded-[24px] border border-black/5 bg-white p-5">
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-lg font-bold">{order.order_number}</p>
              <span className="rounded-full bg-ivory px-2.5 py-1 text-xs font-semibold">
                {order.status === "cancelled" ? "Cancelled" : order.payment_status === "paid" && order.status === "pending" ? "Paid" : STATUS_LABELS[order.status]}
              </span>
            </div>
            {order.status === "cancelled" ? (
              <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">This order was cancelled.</p>
            ) : (
              <ol className="mt-5 space-y-3">
                {STEPS.map((s, i) => (
                  <li key={s.key} className="flex items-center gap-3 text-sm">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        i <= step ? "bg-amber text-ink" : "bg-neutral-100 text-neutral-400"
                      }`}
                    >
                      {i <= step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <span className={i <= step ? "font-semibold" : "text-neutral-400"}>{s.label}</span>
                    {i === step + 1 && i === 1 && <span className="ml-auto text-xs text-brass">Waiting</span>}
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="rounded-[24px] border border-black/5 bg-white p-5">
            <p className="font-semibold">Your items</p>
            <ul className="mt-3 space-y-3">
              {order.items.map((it, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <div className="h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-sand">
                    {it.image_url && <img src={it.image_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{it.product_name}</p>
                    <p className="text-xs text-neutral-500">
                      Size {it.size}
                      {it.color && ` · ${it.color}`} · Qty {it.quantity}
                    </p>
                  </div>
                  <p className="font-medium">{rs(it.line_total)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-black/5 pt-3 text-sm">
              <div className="flex justify-between text-neutral-500"><dt>Subtotal</dt><dd>{rs(order.subtotal)}</dd></div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-green-700"><dt>Discount ({order.coupon_code})</dt><dd>−{rs(order.discount)}</dd></div>
              )}
              <div className="flex justify-between text-neutral-500"><dt>Delivery</dt><dd>{Number(order.delivery_charge) === 0 ? "Free" : rs(order.delivery_charge)}</dd></div>
              <div className="flex justify-between pt-1 text-base font-bold"><dt>Total</dt><dd>{rs(order.total)}</dd></div>
            </dl>
          </div>

          <div className="rounded-[24px] bg-ink p-5 text-sm text-white/80">
            <p className="flex items-center gap-2 font-semibold text-white">
              <CheckCircle2 className="h-4 w-4 text-amber" /> How payment works
            </p>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5">
              <li>We confirm your items and send payment details here.</li>
              <li>Pay by bank transfer, JazzCash or Easypaisa.</li>
              <li>Send us the payment screenshot in this chat.</li>
              <li>We ship your order and update you here.</li>
            </ol>
            <Link href="/shop" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-amber hover:underline">
              <Store className="h-3.5 w-3.5" /> Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
