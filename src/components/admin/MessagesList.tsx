"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, MessageCircle, Phone, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, whatsappLink } from "@/lib/format";
import type { ContactMessage } from "@/lib/types";

export default function MessagesList({ messages }: { messages: ContactMessage[] }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);

  async function toggle(m: ContactMessage) {
    setOpenId(openId === m.id ? null : m.id);
    if (!m.is_read) {
      await createClient().from("contact_messages").update({ is_read: true }).eq("id", m.id);
      router.refresh();
    }
  }

  async function setRead(m: ContactMessage, read: boolean) {
    await createClient().from("contact_messages").update({ is_read: read }).eq("id", m.id);
    router.refresh();
  }

  async function remove(m: ContactMessage) {
    if (!confirm(`Delete the message from ${m.name}?`)) return;
    await createClient().from("contact_messages").delete().eq("id", m.id);
    router.refresh();
  }

  if (messages.length === 0) {
    return <div className="card mt-6 p-12 text-center text-sm text-neutral-500">No messages yet.</div>;
  }

  return (
    <ul className="card mt-6 divide-y divide-neutral-100 overflow-hidden">
      {messages.map((m) => {
        const open = openId === m.id;
        const wa = m.phone ? whatsappLink(m.phone, `Hi ${m.name}, this is Quality Wear replying to your message.`) : null;
        return (
          <li key={m.id} className={m.is_read ? "" : "bg-amber-50/60"}>
            <button onClick={() => toggle(m)} className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-neutral-50">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${m.is_read ? "bg-transparent" : "bg-brass"}`} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className={m.is_read ? "font-medium" : "font-bold"}>{m.name}</span>
                  <span className="text-xs text-neutral-500">{formatDate(m.created_at)}</span>
                </span>
                <span className="mt-0.5 block truncate text-sm text-neutral-600">
                  {m.subject ? `${m.subject} — ` : ""}
                  {m.message}
                </span>
              </span>
            </button>
            {open && (
              <div className="px-5 pb-5 pl-10">
                <p className="whitespace-pre-line rounded-lg bg-neutral-50 p-4 text-sm text-neutral-800">{m.message}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  {m.phone && (
                    <a href={`tel:${m.phone}`} className="btn-outline px-3 py-1.5">
                      <Phone className="h-4 w-4" /> {m.phone}
                    </a>
                  )}
                  {wa && (
                    <a href={wa} target="_blank" rel="noopener noreferrer" className="btn bg-[#25D366] px-3 py-1.5 text-white">
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                  )}
                  {m.email && (
                    <a href={`mailto:${m.email}`} className="btn-outline px-3 py-1.5">
                      <Mail className="h-4 w-4" /> {m.email}
                    </a>
                  )}
                  <button onClick={() => setRead(m, false)} className="btn px-3 py-1.5 text-neutral-600 hover:bg-neutral-100">
                    Mark as unread
                  </button>
                  <button onClick={() => remove(m)} className="btn px-3 py-1.5 text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
