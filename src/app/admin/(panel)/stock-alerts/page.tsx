import { createClient } from "@/lib/supabase/server";
import type { StockAlert } from "@/lib/types";
import StockAlertList from "@/components/admin/StockAlertList";
import { SITE_URL } from "@/lib/site";

export default async function StockAlertsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("stock_alerts")
    .select("*, products(name, slug), product_variants(size, color, stock)")
    .order("notified_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500);
  const alerts = (data ?? []) as (StockAlert & {
    products: { name: string; slug: string } | null;
    product_variants: { size: string; color: string; stock: number } | null;
  })[];
  return (
    <div>
      <h1 className="text-2xl font-bold">Back-in-stock alerts</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Customers who asked to be told when a sold-out size returns. When you add stock, customers with notifications on are told automatically.
        Use the WhatsApp button to message everyone else.
      </p>
      <StockAlertList alerts={alerts} siteUrl={SITE_URL} />
    </div>
  );
}
