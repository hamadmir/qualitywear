import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, rs, STATUS_COLORS, STATUS_LABELS, whatsappLink } from "@/lib/format";
import type { Order } from "@/lib/types";
import OrderStatusControl from "@/components/admin/OrderStatusControl";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const order = data as Order;

  const wa = whatsappLink(
    order.phone,
    `Hi ${order.customer_name}, this is Quality Wear. We'd like to confirm your order ${order.order_number} (${rs(order.total)}).`
  );

  return (
    <div>
      <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Orders
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold">{order.order_number}</h1>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status]}`}>
          {STATUS_LABELS[order.status]}
        </span>
        <span className="text-sm text-neutral-500">{formatDate(order.created_at)}</span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-hidden">
          <h2 className="border-b border-neutral-200 px-5 py-4 font-semibold">Items</h2>
          <ul className="divide-y divide-neutral-100">
            {(order.order_items ?? []).map((it) => (
              <li key={it.id} className="flex items-center gap-4 px-5 py-4 text-sm">
                <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-sand">
                  {it.image_url && <img src={it.image_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1">
                  {it.product_id ? (
                    <Link href={`/admin/products/${it.product_id}`} className="font-medium hover:underline">
                      {it.product_name}
                    </Link>
                  ) : (
                    <p className="font-medium">{it.product_name}</p>
                  )}
                  <p className="text-neutral-500">
                    Size {it.size}
                    {it.color && ` · ${it.color}`} · {rs(it.unit_price)} × {it.quantity}
                  </p>
                </div>
                <p className="font-semibold">{rs(it.line_total)}</p>
              </li>
            ))}
          </ul>
          <dl className="space-y-1 border-t border-neutral-200 px-5 py-4 text-sm">
            <div className="flex justify-between"><dt className="text-neutral-500">Subtotal</dt><dd>{rs(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-neutral-500">Delivery</dt><dd>{rs(order.delivery_charge)}</dd></div>
            <div className="flex justify-between pt-2 text-base font-bold"><dt>Total</dt><dd>{rs(order.total)}</dd></div>
            <div className="flex justify-between pt-1 text-xs text-neutral-500">
              <dt>Payment</dt>
              <dd>{order.payment_method === "cod" ? "Cash on Delivery" : "Online"} · {order.payment_status}</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="font-semibold">Update status</h2>
            <OrderStatusControl orderId={order.id} status={order.status} paymentStatus={order.payment_status} />
          </div>
          <div className="card p-5 text-sm">
            <h2 className="font-semibold">Customer</h2>
            <p className="mt-3 font-medium">{order.customer_name}</p>
            <p className="text-neutral-600">{order.phone}</p>
            {order.email && <p className="text-neutral-600">{order.email}</p>}
            <p className="mt-3 whitespace-pre-line text-neutral-700">{order.address}</p>
            <p className="font-medium">{order.city}</p>
            {order.notes && (
              <p className="mt-3 rounded-md bg-amber-50 p-3 text-amber-900">Note: {order.notes}</p>
            )}
            <div className="mt-4 flex gap-2">
              <a href={`tel:${order.phone}`} className="btn-outline flex-1 py-2">
                <Phone className="h-4 w-4" /> Call
              </a>
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="btn flex-1 bg-[#25D366] py-2 text-white">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
