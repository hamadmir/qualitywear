import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate, rs, STATUS_COLORS, STATUS_LABELS } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";

const FILTERS: (OrderStatus | "all")[] = ["all", "pending", "confirmed", "shipped", "delivered", "cancelled"];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status = "all", q } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
  if (status !== "all") query = query.eq("status", status);
  if (q) {
    const term = q.replace(/[%_,()]/g, " ").trim();
    if (term) query = query.or(`order_number.ilike.%${term}%,customer_name.ilike.%${term}%,phone.ilike.%${term}%`);
  }
  const { data } = await query;
  const orders = (data as Order[]) ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold">Orders</h1>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/admin/orders" : `/admin/orders?status=${f}`}
            className={`rounded-full px-3 py-1.5 text-sm ${
              status === f ? "bg-ink text-white" : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:ring-ink"
            }`}
          >
            {f === "all" ? "All" : STATUS_LABELS[f]}
          </Link>
        ))}
        <form className="ml-auto" action="/admin/orders">
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Order #, name or phone" className="input w-60" />
        </form>
      </div>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="font-mono font-semibold hover:underline">
                    {o.order_number}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <p>{o.customer_name}</p>
                  <p className="text-xs text-neutral-500">{o.phone}</p>
                </td>
                <td className="px-4 py-3">{o.city}</td>
                <td className="px-4 py-3 font-medium">{rs(o.total)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status]}`}>
                    {STATUS_LABELS[o.status]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-500">{formatDate(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <p className="p-10 text-center text-sm text-neutral-500">No orders found.</p>}
      </div>
    </div>
  );
}
