import Link from "next/link";
import { AlertTriangle, Clock, Package, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, rs, STATUS_COLORS, STATUS_LABELS } from "@/lib/format";
import type { Order } from "@/lib/types";
import OrderAlerts from "@/components/admin/OrderAlerts";

function startOfTodayPKT() {
  const now = new Date();
  const pkt = new Date(now.getTime() + 5 * 3600 * 1000);
  pkt.setUTCHours(0, 0, 0, 0);
  return new Date(pkt.getTime() - 5 * 3600 * 1000).toISOString();
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = startOfTodayPKT();
  const monthAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString();

  const [todayRes, pendingRes, productsRes, lowStockRes, recentRes, monthRes, itemsRes] = await Promise.all([
    supabase.from("orders").select("total, status").gte("created_at", today),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase
      .from("product_variants")
      .select("id, size, color, stock, products(id, name)")
      .lte("stock", 2)
      .order("stock")
      .limit(10),
    supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(8),
    supabase.from("orders").select("total, status").gte("created_at", monthAgo),
    supabase
      .from("order_items")
      .select("product_name, quantity, line_total, orders!inner(created_at, status)")
      .gte("orders.created_at", monthAgo)
      .neq("orders.status", "cancelled"),
  ]);

  const todayOrders = (todayRes.data ?? []).filter((o) => o.status !== "cancelled");
  const todaySales = todayOrders.reduce((s, o) => s + Number(o.total), 0);
  const monthSales = (monthRes.data ?? [])
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + Number(o.total), 0);
  const recent = (recentRes.data as Order[]) ?? [];
  const lowStock = (lowStockRes.data ?? []) as unknown as {
    id: string;
    size: string;
    color: string;
    stock: number;
    products: { id: string; name: string } | null;
  }[];

  const top = new Map<string, { qty: number; revenue: number }>();
  for (const it of itemsRes.data ?? []) {
    const cur = top.get(it.product_name) ?? { qty: 0, revenue: 0 };
    cur.qty += it.quantity;
    cur.revenue += Number(it.line_total);
    top.set(it.product_name, cur);
  }
  const topProducts = [...top.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 5);

  const stats = [
    { label: "Today's sales", value: rs(todaySales), sub: `${todayOrders.length} orders`, icon: Wallet },
    { label: "Pending orders", value: String(pendingRes.count ?? 0), sub: "Waiting for confirmation", icon: Clock, href: "/admin/orders?status=pending" },
    { label: "Last 30 days", value: rs(monthSales), sub: "Excluding cancelled", icon: Wallet },
    { label: "Active products", value: String(productsRes.count ?? 0), sub: "Live on website", icon: Package, href: "/admin/products" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <OrderAlerts />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const body = (
            <div className="card h-full p-5">
              <div className="flex items-center justify-between text-sm text-neutral-500">
                {s.label} <s.icon className="h-4 w-4" />
              </div>
              <p className="mt-2 text-2xl font-bold">{s.value}</p>
              <p className="mt-1 text-xs text-neutral-500">{s.sub}</p>
            </div>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="block hover:opacity-80">{body}</Link>
          ) : (
            <div key={s.label}>{body}</div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <h2 className="font-semibold">Recent Orders</h2>
            <Link href="/admin/orders" className="text-sm text-brass hover:underline">View all</Link>
          </div>
          {recent.length === 0 ? (
            <p className="p-8 text-center text-sm text-neutral-500">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-4 px-5 py-3 text-sm hover:bg-neutral-50">
                    <span className="font-mono font-semibold">{o.order_number}</span>
                    <span className="flex-1 truncate">{o.customer_name} · {o.city}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status]}`}>
                      {STATUS_LABELS[o.status]}
                    </span>
                    <span className="hidden w-24 text-right font-medium sm:block">{rs(o.total)}</span>
                    <span className="hidden w-36 text-right text-xs text-neutral-500 md:block">{formatDate(o.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="font-semibold">Top sellers (30 days)</h2>
            {topProducts.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">No data yet.</p>
            ) : (
              <ol className="mt-3 space-y-2 text-sm">
                {topProducts.map(([name, v], i) => (
                  <li key={name} className="flex justify-between gap-2">
                    <span className="truncate">{i + 1}. {name}</span>
                    <span className="shrink-0 font-medium">{v.qty} pcs</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Low stock
            </h2>
            {lowStock.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">All good.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {lowStock.map((v) => (
                  <li key={v.id} className="flex justify-between gap-2">
                    <Link href={`/admin/products/${v.products?.id}`} className="truncate hover:underline">
                      {v.products?.name} ({v.size}{v.color ? `, ${v.color}` : ""})
                    </Link>
                    <span className={`shrink-0 font-semibold ${v.stock === 0 ? "text-red-600" : "text-amber-700"}`}>
                      {v.stock}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
