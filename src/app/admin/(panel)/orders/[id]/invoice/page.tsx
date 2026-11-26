import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { rs } from "@/lib/format";
import type { Order, Settings } from "@/lib/types";
import PrintButton from "@/components/admin/PrintButton";

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const [{ id }, { type }] = await Promise.all([params, searchParams]);
  const slip = type === "slip";
  const supabase = await createClient();
  const [{ data }, { data: settingsRow }] = await Promise.all([
    supabase.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle(),
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
  ]);
  if (!data) notFound();
  const order = data as Order;
  const s = settingsRow as Settings | null;
  const date = new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Karachi" });
  const items = order.order_items ?? [];
  const qty = items.reduce((n, i) => n + i.quantity, 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2 print:hidden">
        <Link href={`/admin/orders/${order.id}`} className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back to order
        </Link>
        <div className="ml-auto flex gap-2">
          <Link
            href={`/admin/orders/${order.id}/invoice`}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${!slip ? "bg-ink text-white" : "border border-neutral-300 bg-white"}`}
          >
            Invoice
          </Link>
          <Link
            href={`/admin/orders/${order.id}/invoice?type=slip`}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${slip ? "bg-ink text-white" : "border border-neutral-300 bg-white"}`}
          >
            Packing slip
          </Link>
          <PrintButton label={slip ? "Print slip" : "Print invoice"} />
        </div>
      </div>

      <div className="mx-auto max-w-3xl rounded-xl bg-white p-8 text-[13px] text-neutral-800 shadow-sm print:max-w-none print:rounded-none print:p-0 print:shadow-none sm:p-12">
        <div className="flex items-start justify-between gap-6 border-b-2 border-neutral-900 pb-6">
          <div>
            <p className="font-display text-2xl font-bold tracking-[0.12em]">QUALITY WEAR</p>
            {s?.address && <p className="mt-2 max-w-xs text-neutral-600">{s.address}</p>}
            <p className="text-neutral-600">
              {[s?.phone, s?.whatsapp_number && s.whatsapp_number !== s?.phone ? `WhatsApp ${s.whatsapp_number}` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {s?.email && <p className="text-neutral-600">{s.email}</p>}
          </div>
          <div className="text-right">
            <p className="text-xl font-bold uppercase tracking-wider">{slip ? "Packing slip" : "Invoice"}</p>
            <p className="mt-2 font-mono text-base font-bold">{order.order_number}</p>
            <p className="text-neutral-600">{date}</p>
            {!slip && (
              <p
                className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-bold uppercase ${
                  order.payment_status === "paid" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"
                }`}
              >
                {order.payment_status === "paid" ? "Paid" : "Payment pending"}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-6 py-6 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{slip ? "Ship to" : "Bill & ship to"}</p>
            <p className={`mt-1 font-semibold ${slip ? "text-lg" : "text-base"}`}>{order.customer_name}</p>
            <p className={slip ? "text-base" : ""}>{order.phone}</p>
            <p className={`whitespace-pre-line ${slip ? "text-base" : ""}`}>{order.address}</p>
            <p className={`font-semibold ${slip ? "text-base" : ""}`}>{order.city}</p>
          </div>
          <div className="sm:text-right">
            {(order.courier || order.tracking_number) && (
              <>
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Shipping</p>
                {order.courier && <p className="mt-1 font-semibold">{order.courier}</p>}
                {order.tracking_number && <p className="font-mono">CN: {order.tracking_number}</p>}
              </>
            )}
            {order.notes && (
              <p className="mt-3 rounded border border-amber-300 bg-amber-50 p-2 text-left text-amber-900">Note: {order.notes}</p>
            )}
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-y border-neutral-300 text-left text-[11px] uppercase tracking-wider text-neutral-500">
              {slip && <th className="w-8 py-2">✓</th>}
              <th className="py-2">Item</th>
              <th className="py-2">Size</th>
              <th className="py-2">Colour</th>
              <th className="py-2 text-right">Qty</th>
              {!slip && <th className="py-2 text-right">Price</th>}
              {!slip && <th className="py-2 text-right">Total</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-neutral-200">
                {slip && (
                  <td className="py-3">
                    <span className="inline-block h-4 w-4 border border-neutral-500" />
                  </td>
                )}
                <td className="py-3 font-medium">{it.product_name}</td>
                <td className="py-3">{it.size}</td>
                <td className="py-3">{it.color ?? "—"}</td>
                <td className="py-3 text-right font-semibold">{it.quantity}</td>
                {!slip && <td className="py-3 text-right">{rs(it.unit_price)}</td>}
                {!slip && <td className="py-3 text-right font-medium">{rs(it.line_total)}</td>}
              </tr>
            ))}
          </tbody>
        </table>

        {slip ? (
          <p className="mt-4 text-right font-semibold">Total pieces: {qty}</p>
        ) : (
          <dl className="ml-auto mt-4 w-full max-w-xs space-y-1">
            <div className="flex justify-between"><dt className="text-neutral-600">Subtotal</dt><dd>{rs(order.subtotal)}</dd></div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between"><dt className="text-neutral-600">Discount ({order.coupon_code})</dt><dd>−{rs(order.discount)}</dd></div>
            )}
            <div className="flex justify-between"><dt className="text-neutral-600">Delivery</dt><dd>{Number(order.delivery_charge) === 0 ? "Free" : rs(order.delivery_charge)}</dd></div>
            <div className="flex justify-between border-t-2 border-neutral-900 pt-2 text-base font-bold"><dt>Total</dt><dd>{rs(order.total)}</dd></div>
            <div className="flex justify-between text-xs text-neutral-500">
              <dt>Payment</dt>
              <dd>Bank / JazzCash / Easypaisa · {order.payment_status === "paid" ? "Paid" : "Pending"}</dd>
            </div>
          </dl>
        )}

        <div className="mt-10 border-t border-neutral-200 pt-4 text-center text-xs text-neutral-500">
          Thank you for shopping with Quality Wear! For size exchanges, message us on WhatsApp with your order number.
          {s?.instagram_url && <span> · Follow us on Instagram</span>}
        </div>
      </div>
    </div>
  );
}
