import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";
import CategoryManager from "@/components/admin/CategoryManager";

export default async function CategoriesPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: counts }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order").order("name"),
    supabase.from("products").select("category_id"),
  ]);
  const productCounts: Record<string, number> = {};
  for (const row of counts ?? []) {
    if (row.category_id) productCounts[row.category_id] = (productCounts[row.category_id] ?? 0) + 1;
  }
  return (
    <div>
      <h1 className="text-2xl font-bold">Categories</h1>
      <CategoryManager categories={(categories as Category[]) ?? []} productCounts={productCounts} />
    </div>
  );
}
