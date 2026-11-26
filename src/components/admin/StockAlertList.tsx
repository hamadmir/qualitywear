"use client";

import { useRouter } from "next/navigation";
import { Bell, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { whatsappLink } from "@/lib/format";
import type { StockAlert } from "@/lib/types";

type Row = StockAlert & {
  products: { name: string; slug: string } | null;
  product_variants: { size: string; color: string; stock: number } | null;
};

export default function StockAlertList({ alerts, siteUrl }: { alerts: Row[]; siteUrl: string }) {
  const router = useRouter();
  if (alerts.length === 0) return <p className="card mt-6 p-8 text-center text-sm text-neutral-500">No alerts yet.</p>;

  async function remove(id: string) {
    await createClient().from("stock_alerts").delete().eq("id", id);
    router.refresh();
  }

  const ready = alerts.filter((a) => (a.product_variants?.stock ?? 0) > 0);
  const waiting = alerts.filter((a) => (a.product_variants?.stock ?? 0) <= 0);

  const section = (title: string, rows: Row[], hint: string) =>
    rows.length > 0 && (
      <section className="mt-6">
        <h2 className="font-semibold">
          {title} <span className="text-neutral-400">({rows.length})</span>
        </h2>
        <p className="text-xs text-neutral-500">{hint}</p>
        <div className="card mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">Size</th>
                <th className="px-4 py-2">Stock now</th>
                <th className="px-4 py-2">Asked</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((a) => {
                const product = a.products?.name ?? "the item";
                const size = a.product_variants ? `${a.product_variants.size}${a.product_variants.color ? ` (${a.product_variants.color})` : ""}` : "";
                const wa = whatsappLink(
                  a.phone,
                  `Hi${a.name ? ` ${a.name}` : ""}! Good news from Quality Wear: ${product} in size ${size} is back in stock. Order here before it sells out: ${siteUrl}/product/${a.products?.slug ?? ""}`
                );
                return (
                  <tr key={a.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{a.name || "—"}</p>
                      <p className="text-xs text-neutral-500">{a.phone}</p>
                      {a.endpoint && (
                        <p className="flex items-center gap-1 text-[11px] text-green-700">
                          <Bell className="h-3 w-3" /> Notifications on
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">{product}</td>
                    <td className="px-4 py-3">{size}</td>
                    <td className="px-4 py-3">{a.product_variants?.stock ?? 0}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-500">
                      {new Date(a.created_at).toLocaleDateString("en-GB", { timeZone: "Asia/Karachi" })}
                      {a.notified_at && <p className="text-green-700">Restocked {new Date(a.notified_at).toLocaleDateString("en-GB", { timeZone: "Asia/Karachi" })}</p>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer" className="btn mr-2 bg-[#25D366] px-3 py-1.5 text-xs text-white">
                          WhatsApp
                        </a>
                      )}
                      <button onClick={() => remove(a.id)} className="btn-outline px-2 py-1.5 text-xs" title="Remove from list" aria-label="Remove">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    );

  return (
    <>
      {section("Back in stock: message these customers", ready, "The size is available again. Send a WhatsApp, then remove them from the list.")}
      {section("Still waiting", waiting, "These sizes are still sold out. Add stock in Products to notify them.")}
    </>
  );
}
