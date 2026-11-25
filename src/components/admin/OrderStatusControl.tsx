"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { STATUS_LABELS } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";

const STATUSES: OrderStatus[] = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

export default function OrderStatusControl({
  orderId,
  status,
  paymentStatus,
}: {
  orderId: string;
  status: OrderStatus;
  paymentStatus: Order["payment_status"];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(patch: Partial<Pick<Order, "status" | "payment_status">>) {
    if (patch.status === "cancelled" && !confirm("Cancel this order? Stock will be returned and the order cannot be reopened.")) return;
    setSaving(true);
    setError("");
    const { error } = await createClient().from("orders").update(patch).eq("id", orderId);
    setSaving(false);
    if (error) setError(error.message);
    else router.refresh();
  }

  const locked = status === "cancelled";

  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            disabled={saving || locked || s === status}
            onClick={() => save({ status: s })}
            className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
              s === status
                ? "border-ink bg-ink text-white"
                : s === "cancelled"
                  ? "border-red-200 text-red-700 hover:bg-red-50"
                  : "border-neutral-300 hover:border-ink"
            } disabled:cursor-not-allowed ${s !== status ? "disabled:opacity-40" : ""}`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={paymentStatus === "paid"}
          disabled={saving}
          onChange={(e) => save({ payment_status: e.target.checked ? "paid" : "unpaid" })}
        />
        Payment received
      </label>
      {saving && <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
