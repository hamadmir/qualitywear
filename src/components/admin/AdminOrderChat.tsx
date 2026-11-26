"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, CheckCheck, CreditCard, ExternalLink, Loader2, Paperclip, Send, Truck, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/lib/types";

type Msg = {
  id: string;
  sender: "customer" | "admin" | "system";
  body: string;
  attachment_path: string | null;
  read_by_admin: boolean;
  read_by_customer: boolean;
  created_at: string;
};

function time(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short", timeZone: "Asia/Karachi" });
}

export default function AdminOrderChat({
  order,
  paymentInstructions,
}: {
  order: Pick<Order, "id" | "order_number" | "status" | "payment_status" | "total" | "customer_name"> & {
    courier?: string | null;
    tracking_number?: string | null;
    tracking_url?: string | null;
  };
  paymentInstructions: string | null;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shipOpen, setShipOpen] = useState(false);
  const [courier, setCourier] = useState(order.courier ?? "TCS");
  const [otherCourier, setOtherCourier] = useState("");
  const [trackingNo, setTrackingNo] = useState(order.tracking_number ?? "");
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url ?? "");
  const listRef = useRef<HTMLDivElement>(null);
  const count = useRef(0);
  const linksRef = useRef<Record<string, string>>({});

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("order_messages").select("*").eq("order_id", order.id).order("created_at");
    const list = (data as Msg[]) ?? [];
    setMessages(list);
    if (list.some((m) => !m.read_by_admin)) {
      await supabase.from("order_messages").update({ read_by_admin: true }).eq("order_id", order.id).eq("read_by_admin", false);
    }
    const paths = list.map((m) => m.attachment_path).filter((p): p is string => !!p);
    const missing = paths.filter((p) => !linksRef.current[p]);
    if (missing.length) {
      const { data: signed } = await supabase.storage.from("payment-proofs").createSignedUrls(missing, 60 * 60);
      if (signed) {
        const next = { ...linksRef.current };
        signed.forEach((s) => {
          if (s.path && s.signedUrl) next[s.path] = s.signedUrl;
        });
        linksRef.current = next;
        setLinks(next);
      }
    }
  }, [order.id]);

  useEffect(() => {
    load();
    const id = setInterval(() => document.visibilityState === "visible" && load(), 5000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (messages.length !== count.current) {
      count.current = messages.length;
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  async function sendText(body: string) {
    if (!body.trim()) return;
    setBusy(true);
    setError("");
    const { error } = await createClient()
      .from("order_messages")
      .insert({ order_id: order.id, sender: "admin", body: body.trim().slice(0, 2000), read_by_admin: true });
    setBusy(false);
    if (error) return setError(error.message);
    setText("");
    load();
  }

  async function ship() {
    const name = courier === "Other" ? otherCourier.trim() : courier;
    const url = trackingUrl.trim();
    if (url && !/^https?:\/\//i.test(url)) return setError("The tracking link must start with https://");
    await update({
      ...(order.status !== "shipped" ? { status: "shipped" as const } : {}),
      courier: name || null,
      tracking_number: trackingNo.trim() || null,
      tracking_url: url || null,
    });
    setShipOpen(false);
  }

  async function update(
    patch: Partial<Pick<Order, "status" | "payment_status">> & { courier?: string | null; tracking_number?: string | null; tracking_url?: string | null }
  ) {
    setBusy(true);
    setError("");
    const { error } = await createClient().from("orders").update(patch).eq("id", order.id);
    setBusy(false);
    if (error) return setError(error.message);
    router.refresh();
    load();
  }

  const totalText = `Rs. ${Number(order.total).toLocaleString("en-PK")}`;
  const paymentMessage = paymentInstructions?.trim()
    ? `Hi ${order.customer_name}, your order ${order.order_number} is confirmed and available. Please pay ${totalText} to:\n\n${paymentInstructions.trim()}\n\nOnce paid, please send the payment screenshot here.`
    : null;

  const closed = order.status === "cancelled" || order.status === "delivered";

  return (
    <div className="card flex h-[640px] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
        <h2 className="font-semibold">Chat with {order.customer_name}</h2>
        <span className="text-xs text-neutral-500">Updates every 5 seconds</span>
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-neutral-50 px-4 py-4">
        {messages.map((m) =>
          m.sender === "system" ? (
            <div key={m.id} className="mx-auto max-w-md rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-900">
              <p className="whitespace-pre-line">{m.body}</p>
              <p className="mt-0.5 text-[10px] text-amber-700/70">{time(m.created_at)} · automatic</p>
            </div>
          ) : (
            <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                  m.sender === "admin" ? "rounded-br-md bg-ink text-white" : "rounded-bl-md border border-neutral-200 bg-white"
                }`}
              >
                {m.attachment_path && (
                  <a
                    href={links[m.attachment_path] ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-1.5 block overflow-hidden rounded-xl border border-black/10"
                  >
                    {links[m.attachment_path] && !m.attachment_path.endsWith(".pdf") ? (
                      <img src={links[m.attachment_path]} alt="Payment screenshot" className="max-h-72 w-full object-contain bg-neutral-100" />
                    ) : (
                      <span className="flex items-center gap-1.5 p-3 text-xs font-semibold">
                        <Paperclip className="h-3.5 w-3.5" /> Open attachment <ExternalLink className="h-3 w-3" />
                      </span>
                    )}
                  </a>
                )}
                {m.body && <p className="whitespace-pre-line break-words">{m.body}</p>}
                <p className={`mt-0.5 text-right text-[10px] ${m.sender === "admin" ? "text-white/50" : "text-neutral-400"}`}>
                  {time(m.created_at)}
                  {m.sender === "admin" && (m.read_by_customer ? " · Seen" : " · Sent")}
                </p>
              </div>
            </div>
          )
        )}
      </div>

      {!closed && (
        <div className="flex flex-wrap gap-2 border-t border-neutral-200 px-4 pt-3">
          {paymentMessage ? (
            <button onClick={() => sendText(paymentMessage)} disabled={busy} className="btn-outline px-3 py-1.5 text-xs">
              <CreditCard className="h-3.5 w-3.5" /> Send payment details
            </button>
          ) : (
            <a href="/admin/settings" className="btn-outline px-3 py-1.5 text-xs">
              <CreditCard className="h-3.5 w-3.5" /> Add payment details in Settings
            </a>
          )}
          {order.payment_status !== "paid" && (
            <button
              onClick={() => update({ payment_status: "paid", ...(order.status === "pending" ? { status: "confirmed" } : {}) })}
              disabled={busy}
              className="btn bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700"
            >
              <BadgeCheck className="h-3.5 w-3.5" /> Payment received
            </button>
          )}
          <button onClick={() => setShipOpen((v) => !v)} disabled={busy} className="btn bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-700">
            <Truck className="h-3.5 w-3.5" /> {order.status === "shipped" ? "Edit tracking" : "Mark as shipped"}
          </button>
          {order.status === "shipped" && (
            <button onClick={() => update({ status: "delivered" })} disabled={busy} className="btn bg-green-700 px-3 py-1.5 text-xs text-white hover:bg-green-800">
              <CheckCheck className="h-3.5 w-3.5" /> Mark delivered
            </button>
          )}
          {shipOpen && (
            <div className="mt-1 w-full rounded-xl border border-indigo-200 bg-indigo-50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-indigo-900">Shipping details (sent to the customer in the chat)</p>
                <button onClick={() => setShipOpen(false)} className="text-indigo-900/60 hover:text-indigo-900" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <select value={courier} onChange={(e) => setCourier(e.target.value)} className="input py-2 text-sm">
                  {["TCS", "Leopards", "M&P", "PostEx", "Trax", "Call Courier", "BlueEx", "Pakistan Post", "Own rider", "Other"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                {courier === "Other" ? (
                  <input value={otherCourier} onChange={(e) => setOtherCourier(e.target.value)} placeholder="Courier name" className="input py-2 text-sm" />
                ) : (
                  <input value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} placeholder="Tracking / CN number" className="input py-2 text-sm" />
                )}
                {courier === "Other" && (
                  <input value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} placeholder="Tracking / CN number" className="input py-2 text-sm" />
                )}
                <input
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="Tracking link (optional) https://…"
                  className="input py-2 text-sm sm:col-span-2"
                />
              </div>
              <button onClick={ship} disabled={busy} className="btn mt-2 w-full bg-indigo-600 py-2 text-xs text-white hover:bg-indigo-700">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
                {order.status === "shipped" ? "Update tracking" : "Ship & notify customer"}
              </button>
            </div>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendText(text);
        }}
        className="flex items-end gap-2 p-4"
      >
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendText(text);
            }
          }}
          placeholder="Write a reply… (Enter to send, Shift+Enter for a new line)"
          className="input min-h-11 flex-1 resize-none rounded-2xl"
        />
        <button disabled={busy || !text.trim()} className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white disabled:opacity-40" aria-label="Send">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
      {error && <p className="px-4 pb-3 text-xs text-red-600">{error}</p>}
    </div>
  );
}
