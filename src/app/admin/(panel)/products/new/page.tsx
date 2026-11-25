import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";
import ProductForm from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").order("sort_order").order("name");
  return <ProductForm categories={(data as Category[]) ?? []} />;
}
