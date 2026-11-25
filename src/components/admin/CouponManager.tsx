"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { rs } from "@/lib/format";
import type { Coupon } from "@/lib/types";

type Draft = {
  id?: string;
  code: string;
  description: string;
  discount_type: "percent" | "fixed";
  value: string;
  max_discount: string;
  min_order: string;
  max_uses: string;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
};

const EMPTY: Draft = {
  code: "",
  description: "",
  discount_type: "percent",
  value: "",
  max_discount: "",
  min_order: "",
  max_uses: "",
  starts_at: "",
  expires_at: "",
  is_active: true,
};

const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 5 * 3600 * 1000).toISOString().slice(0, 16) : "");
const fromLocal = (v: string) => (v ? new Date(`${v}:00+05:00`).toISOString() : null);

function statusOf(c: Coupon) {
  const now = Date.now();
  if (!c.is_active) return { label: "Off", cls: "bg-neutral-200 text-neutral-600" };
  if (c.expires_at && new Date(c.expires_at).getTime() <= now) return { label: "Expired", cls: "bg-red-100 text-red-700" };
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return { label: "Scheduled", cls: "bg-blue-100 text-blue-800" };
  if (c.max_uses != null && c.used_count >= c.max_uses) return { label: "Used up", cls: "bg-amber-100 text-amber-800" };
  return { label: "Active", cls: "bg-green-100 text-green-800" };
}

export default function CouponManager({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  function edit(c: Coupon) {
    setError("");
    setDraft({
      id: c.id,
      code: c.code,
      description: c.description ?? "",
      discount_type: c.discount_type,
      value: String(c.value),
      max_discount: c.max_discount != null ? String(c.max_discount) : "",
      min_order: Number(c.min_order) ? String(c.min_order) : "",
      max_uses: c.max_uses != null ? String(c.max_uses) : "",
      starts_at: toLocal(c.starts_at),
      expires_at: toLocal(c.expires_at),
      is_active: c.is_active,
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const code = draft.code.trim().toUpperCase().replace(/\s+/g, "");
    const value = Number(draft.value);
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return setError("Code must be 3–30 letters or numbers, e.g. EID20.");
    if (!value || value <= 0) return setError("Enter a discount value.");
    if (draft.discount_type === "percent" && value > 100) return setError("A percentage discount can't be more than 100.");
    setSaving(true);
    setError("");
    const payload = {
      code,
      description: draft.description.trim() || null,
      discount_type: draft.discount_type,
      value,
      max_discount: draft.discount_type === "percent" && draft.max_discount ? Number(draft.max_discount) : null,
      min_order: Number(draft.min_order) || 0,
      max_uses: draft.max_uses ? Number(draft.max_uses) : null,
      starts_at: fromLocal(draft.starts_at),
      expires_at: fromLocal(draft.expires_at),
      is_active: draft.is_active,
    };
    const supabase = createClient();
    const { error } = draft.id
      ? await supabase.from("coupons").update(payload).eq("id", draft.id)
      : await supabase.from("coupons").insert(payload);
    setSaving(false);
    if (error) {
      setError(error.message.includes("coupons_code_key") ? "A coupon with this code already exists." : error.message);
      return;
    }
    setDraft(null);
    router.refresh();
  }

  async function toggle(c: Coupon) {
    await createClient().from("coupons").update({ is_active: !c.is_active }).eq("id", c.id);
    router.refresh();
  }

  async function remove(c: Coupon) {
    if (!confirm(`Delete coupon ${c.code}? Past orders will keep their discount.`)) return;
    await createClient().from("coupons").delete().eq("id", c.id);
    router.refresh();
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard unavailable
    }
  }

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDraft((d) => (d ? { ...d, [k]: e.target.value } : d));

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="card overflow-hidden">
        {coupons.length === 0 ? (
          <p className="p-10 text-center text-sm text-neutral-500">No coupons yet. Create one like EID20 for 20% off.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {coupons.map((c) => {
              const st = statusOf(c);
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <button onClick={() => copy(c.code)} className="flex items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-3 py-1.5 font-mono text-sm font-bold hover:border-ink" title="Copy code">
                    {c.code} <Copy className="h-3.5 w-3.5 text-neutral-400" />
                  </button>
                  {copied === c.code && <span className="text-xs text-green-700">Copied</span>}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {c.discount_type === "percent" ? `${Number(c.value)}% off` : `${rs(c.value)} off`}
                      {c.max_discount != null && ` (up to ${rs(c.max_discount)})`}
                      {Number(c.min_order) > 0 && ` · min ${rs(c.min_order)}`}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Used {c.used_count}
                      {c.max_uses != null ? ` / ${c.max_uses}` : ""} times
                      {c.expires_at && ` · ends ${new Date(c.expires_at).toLocaleDateString("en-GB", { timeZone: "Asia/Karachi" })}`}
                      {c.description && ` · ${c.description}`}
                    </p>
                  </div>
                  <button onClick={() => toggle(c)} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`} title="Turn on / off">
                    {st.label}
                  </button>
                  <button onClick={() => edit(c)} className="p-2 text-neutral-500 hover:text-ink" aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(c)} className="p-2 text-neutral-400 hover:text-red-600" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        {draft ? (
          <form onSubmit={save} className="card space-y-4 p-5">
            <h2 className="font-semibold">{draft.id ? "Edit coupon" : "New coupon"}</h2>
            <div>
              <label className="label" htmlFor="cp-code">Code *</label>
              <input id="cp-code" className="input font-mono uppercase" placeholder="EID20" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="cp-type">Type</label>
                <select id="cp-type" className="input" value={draft.discount_type} onChange={set("discount_type")}>
                  <option value="percent">% off</option>
                  <option value="fixed">Rs. off</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="cp-value">{draft.discount_type === "percent" ? "Percent *" : "Amount (Rs.) *"}</label>
                <input id="cp-value" type="number" min={1} className="input" value={draft.value} onChange={set("value")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="cp-min">Min. order (Rs.)</label>
                <input id="cp-min" type="number" min={0} className="input" placeholder="None" value={draft.min_order} onChange={set("min_order")} />
              </div>
              {draft.discount_type === "percent" ? (
                <div>
                  <label className="label" htmlFor="cp-cap">Max discount (Rs.)</label>
                  <input id="cp-cap" type="number" min={1} className="input" placeholder="No cap" value={draft.max_discount} onChange={set("max_discount")} />
                </div>
              ) : (
                <div />
              )}
            </div>
            <div>
              <label className="label" htmlFor="cp-uses">Total uses allowed</label>
              <input id="cp-uses" type="number" min={1} className="input" placeholder="Unlimited" value={draft.max_uses} onChange={set("max_uses")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="cp-start">Starts</label>
                <input id="cp-start" type="datetime-local" className="input" value={draft.starts_at} onChange={set("starts_at")} />
              </div>
              <div>
                <label className="label" htmlFor="cp-end">Ends</label>
                <input id="cp-end" type="datetime-local" className="input" value={draft.expires_at} onChange={set("expires_at")} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="cp-desc">Note (only you see this)</label>
              <input id="cp-desc" className="input" placeholder="e.g. Eid sale on Instagram" value={draft.description} onChange={set("description")} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} />
              Active
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button className="btn-primary flex-1" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save coupon
              </button>
              <button type="button" className="btn-outline" onClick={() => setDraft(null)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => {
              setError("");
              setDraft(EMPTY);
            }}
            className="btn-primary w-full py-3"
          >
            <Plus className="h-4 w-4" /> New Coupon
          </button>
        )}
      </div>
    </div>
  );
}
