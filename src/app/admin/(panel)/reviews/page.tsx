import { createClient } from "@/lib/supabase/server";
import type { Review } from "@/lib/types";
import ReviewManager from "@/components/admin/ReviewManager";

export default async function AdminReviewsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_reviews")
    .select("*, products(name, slug), orders(order_number)")
    .order("is_approved", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(300);
  const reviews = (data ?? []) as (Review & { products: { name: string; slug: string } | null; orders: { order_number: string } | null })[];
  const pending = reviews.filter((r) => !r.is_approved).length;
  return (
    <div>
      <h1 className="text-2xl font-bold">Reviews</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Only customers whose order has shipped can leave a review. Approve a review to show it on the product page
        {pending > 0 ? ` · ${pending} waiting for approval` : ""}.
      </p>
      <ReviewManager reviews={reviews} />
    </div>
  );
}
