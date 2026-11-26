import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { rs, STATUS_LABELS } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";
import ReportDownload from "@/components/admin/ReportDownload";

const PRESETS = [
  { key: "7", label: "Last 7 days" },
  { key: "30", label: "Last 30 days" },
  { key: "90", label: "Last 90 days" },
  { key: "365", label: "Last 12 months" },
];

function pkDate(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" }); // YYYY-MM-DD
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; days?: string }> }) {
  const sp = await searchParams;
  const today = pkDate(new Date());
  const days = sp.days ?? (sp.from ? undefined : "30");
  const to = sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : today;
  const from =
    sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from)
      ? sp.from
      : pkDate(new Date(Date.now() - (Number(days) - 1) * 86400000));

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .gte("created_at", `${from}T00:00:00+05:00`)
    .lte("created_at", `${to}T23:59:59.999+05:00`)
    .order("created_at", { ascending: true })
    .limit(10000);
  const orders = (data as Order[]) ?? [];

  const live = orders.filter((o) => o.status !== "cancelled");
  const paid = live.filter((o) => o.payment_status === "paid");
  const revenue = paid.reduce((s, o) => s + Number(o.total), 0);
  const booked = live.reduce((s, o) => s + Number(o.total), 0);
  const unpaidValue = live.filter((o) => o.payment_status !== "paid").reduce((s, o) => s + Number(o.total), 0);
  const aov = paid.length ? revenue / paid.length : 0;
  const discount = live.reduce((s, o) => s + Number(o.discount ?? 0), 0);

  const byStatus = new Map<OrderStatus, number>();
  orders.forEach((o) => byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1));

  const byDay = new Map<string, { orders: number; revenue: number }>();
  for (let t = new Date(`${from}T12:00:00+05:00`).getTime(); t <= new Date(`${to}T12:00:00+05:00`).getTime(); t += 86400000) {
    byDay.set(pkDate(new Date(t)), { orders: 0, revenue: 0 });
  }
  live.forEach((o) => {
    const d = pkDate(new Date(o.created_at));
    const row = byDay.get(d) ?? { orders: 0, revenue: 0 };
    row.orders += 1;
    if (o.payment_status === "paid") row.revenue += Number(o.total);
    byDay.set(d, row);
  });
  const dayRows = [...byDay.entries()];
  const maxDay = Math.max(1, ...dayRows.map(([, v]) => v.revenue));

  const products = new Map<string, { qty: number; revenue: number }>();
  const sizes = new Map<string, number>();
  live.forEach((o) =>
    (o.order_items ?? []).forEach((i) => {
      const p = products.get(i.product_name) ?? { qty: 0, revenue: 0 };
      p.qty += i.quantity;
      p.revenue += Number(i.line_total);
      products.set(i.product_name, p);
      if (i.size) sizes.set(i.size, (sizes.get(i.size) ?? 0) + i.quantity);
    })
  );
  const topProducts = [...products.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 10);
  const topSizes = [...sizes.entries()].sort((a, b) => b[1] - a[1]);

  const cities = new Map<string, { orders: number; revenue: number }>();
  live.forEach((o) => {
    const c = o.city.trim().replace(/\b\w/g, (m) => m.toUpperCase());
    const row = cities.get(c) ?? { orders: 0, revenue: 0 };
    row.orders += 1;
    row.revenue += Number(o.total);
    cities.set(c, row);
  });
  const topCities = [...cities.entries()].sort((a, b) => b[1].orders - a[1].orders).slice(0, 8);

  const stats = [
    { label: "Paid revenue", value: rs(revenue), sub: `${paid.length} paid orders` },
    { label: "Orders booked", value: String(live.length), sub: `${rs(booked)} total value` },
    { label: "Awaiting payment", value: rs(unpaidValue), sub: `${live.length - paid.length} orders` },
    { label: "Average paid order", value: rs(Math.round(aov)), sub: discount > 0 ? `${rs(discount)} in coupon discounts` : "No coupon discounts" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {new Date(`${from}T12:00:00+05:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} –{" "}
            {new Date(`${to}T12:00:00+05:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · cancelled orders excluded
          </p>
        </div>
        <ReportDownload orders={orders} from={from} to={to} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <Link
            key={p.key}
            href={`/admin/reports?days=${p.key}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${days === p.key && !sp.from ? "bg-ink text-white" : "border border-neutral-300 bg-white"}`}
          >
            {p.label}
          </Link>
        ))}
        <form className="flex items-center gap-2 text-sm" action="/admin/reports">
          <input type="date" name="from" defaultValue={from} className="input w-auto py-1.5" />
          <span>to</span>
          <input type="date" name="to" defaultValue={to} className="input w-auto py-1.5" />
          <button className="btn-outline px-3 py-1.5 text-sm">Apply</button>
        </form>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-sm text-neutral-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
            <p className="mt-1 text-xs text-neutral-400">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="card mt-6 p-5">
        <h2 className="font-semibold">Paid sales by day</h2>
        {dayRows.length > 0 && (
          <div className="mt-4 flex h-44 items-end gap-[2px]">
            {dayRows.map(([d, v]) => (
              <div key={d} className="group relative flex h-full flex-1 items-end" title={`${d}: ${rs(v.revenue)} · ${v.orders} orders`}>
                <div className="w-full rounded-t bg-amber-400 transition group-hover:bg-amber-500" style={{ height: `${Math.max(v.revenue ? 3 : 0, (v.revenue / maxDay) * 100)}%` }} />
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 flex justify-between text-[11px] text-neutral-400">
          <span>{dayRows[0]?.[0]}</span>
          <span>{dayRows[dayRows.length - 1]?.[0]}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <h2 className="border-b border-neutral-200 px-5 py-3 font-semibold">Best sellers</h2>
          {topProducts.length === 0 ? (
            <p className="p-5 text-sm text-neutral-500">No sales in this period.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-neutral-100">
                {topProducts.map(([name, v], i) => (
                  <tr key={name}>
                    <td className="w-8 px-5 py-2.5 text-neutral-400">{i + 1}</td>
                    <td className="py-2.5 font-medium">{name}</td>
                    <td className="px-3 py-2.5 text-right">{v.qty} pcs</td>
                    <td className="px-5 py-2.5 text-right text-neutral-500">{rs(v.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="font-semibold">Orders by status</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {(["pending", "confirmed", "shipped", "delivered", "cancelled"] as OrderStatus[]).map((st) => (
                <span key={st} className="rounded-full bg-neutral-100 px-3 py-1">
                  {STATUS_LABELS[st]}: <b>{byStatus.get(st) ?? 0}</b>
                </span>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <h2 className="font-semibold">Most ordered sizes</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {topSizes.length === 0 ? <span className="text-neutral-500">—</span> : topSizes.map(([s, n]) => (
                <span key={s} className="rounded-full bg-neutral-100 px-3 py-1">{s}: <b>{n}</b></span>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <h2 className="font-semibold">Top cities</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {topCities.length === 0 ? <li className="text-neutral-500">—</li> : topCities.map(([c, v]) => (
                <li key={c} className="flex justify-between"><span>{c}</span><span className="text-neutral-500">{v.orders} orders · {rs(v.revenue)}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
