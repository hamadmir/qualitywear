import { createClient } from "@/lib/supabase/server";
import type { Coupon } from "@/lib/types";
import CouponManager from "@/components/admin/CouponManager";

export default async function CouponsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
  return (
    <div>
      <h1 className="text-2xl font-bold">Coupons</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Create discount codes for sales, Eid offers or Instagram promotions. Customers enter the code at checkout.
      </p>
      <CouponManager coupons={(data as Coupon[]) ?? []} />
    </div>
  );
}
