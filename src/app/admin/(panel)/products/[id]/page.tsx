import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PRODUCT_SELECT, type Category, type Product } from "@/lib/types";
import ProductForm from "@/components/admin/ProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase.from("products").select(PRODUCT_SELECT).eq("id", id).maybeSingle(),
    supabase.from("categories").select("*").order("sort_order").order("name"),
  ]);
  if (!product) notFound();
  return <ProductForm product={product as Product} categories={(categories as Category[]) ?? []} />;
}
