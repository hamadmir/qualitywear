"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const EMPTY = { name: "", phone: "", email: "", subject: "", message: "", website: "" };
const field = "w-full rounded-2xl border border-black/10 bg-ivory/60 px-4 py-3 text-sm outline-none transition focus:border-ink focus:bg-white focus:ring-4 focus:ring-black/5";

export default function ContactForm() {
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.website) {
      setSent(true); // bot trap
      return;
    }
    if (!form.phone.trim() && !form.email.trim()) {
      setError("Please add a phone number or email so we can reply.");
      return;
    }
    setSending(true);
    const { error } = await createClient()
      .from("contact_messages")
      .insert({
        name: form.name.trim().slice(0, 100),
        phone: form.phone.trim().slice(0, 30) || null,
        email: form.email.trim().slice(0, 150) || null,
        subject: form.subject.trim().slice(0, 150) || null,
        message: form.message.trim().slice(0, 3000),
      });
    setSending(false);
    if (error) {
      setError("Your message couldn't be sent. Please try again or message us on WhatsApp.");
      return;
    }
    setSent(true);
    setForm(EMPTY);
  }

  if (sent) {
    return (
      <div className="animate-fade-up mt-8 rounded-[22px] bg-ivory p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
        <p className="mt-4 text-lg font-bold">Thank you! Your message has been sent.</p>
        <p className="mt-1 text-sm text-neutral-600">We&apos;ll get back to you shortly.</p>
        <button onClick={() => setSent(false)} className="btn-outline mt-6 rounded-full px-6">Send another message</button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="c-name">Name *</label>
          <input id="c-name" required maxLength={100} className={field} value={form.name} onChange={update("name")} autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="c-phone">Phone</label>
          <input id="c-phone" type="tel" maxLength={30} placeholder="03001234567" className={field} value={form.phone} onChange={update("phone")} autoComplete="tel" />
        </div>
        <div>
          <label className="label" htmlFor="c-email">Email</label>
          <input id="c-email" type="email" maxLength={150} className={field} value={form.email} onChange={update("email")} autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="c-subject">Subject</label>
          <input id="c-subject" maxLength={150} placeholder="Order, size, exchange…" className={field} value={form.subject} onChange={update("subject")} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="c-message">Message *</label>
        <textarea id="c-message" required rows={6} maxLength={3000} className={field} value={form.message} onChange={update("message")} />
      </div>
      <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={form.website} onChange={update("website")} />
      {error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-7 font-semibold text-white transition hover:bg-black disabled:opacity-60" disabled={sending}>
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send message
      </button>
    </form>
  );
}
