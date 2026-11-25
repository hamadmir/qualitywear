import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PRODUCT_SELECT, type Product } from "@/lib/types";
import { mainImage, rs, totalStock } from "@/lib/format";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("products").select(PRODUCT_SELECT).order("created_at", { ascending: false }).limit(500);
  if (q) {
    const term = q.replace(/[%_,()]/g, " ").trim();
    if (term) query = query.ilike("name", `%${term}%`);
  }
  const { data } = await query;
  const products = (data as Product[]) ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Products</h1>
        <form className="ml-auto" action="/admin/products">
          <input name="q" defaultValue={q} placeholder="Product search" className="input w-56" />
        </form>
        <Link href="/admin/products/new" className="btn-primary">
          <Plus className="h-4 w-4" /> New product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="card mt-6 p-12 text-center">
          <p className="text-neutral-600">No products yet.</p>
          <Link href="/admin/products/new" className="btn-primary mt-4">Add your first product</Link>
        </div>
      ) : (
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {products.map((p) => {
                const img = mainImage(p);
                const stock = totalStock(p);
                return (
                  <tr key={p.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                        <div className="h-14 w-11 shrink-0 overflow-hidden rounded bg-sand">
                          {img && <img src={img} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <span className="font-medium hover:underline">{p.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{p.categories?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {p.sale_price != null ? (
                        <>
                          <span className="font-medium">{rs(p.sale_price)}</span>{" "}
                          <span className="text-xs text-neutral-400 line-through">{rs(p.price)}</span>
                        </>
                      ) : (
                        <span className="font-medium">{rs(p.price)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={stock === 0 ? "font-semibold text-red-600" : stock <= 5 ? "text-amber-700" : ""}>
                        {stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            p.is_active ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-600"
                          }`}
                        >
                          {p.is_active ? "Live" : "Hidden"}
                        </span>
                        {p.is_featured && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Featured</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
