"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowLeftCircle, ArrowRightCircle, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteImages, uploadImage } from "@/lib/image-upload";
import { slugify } from "@/lib/format";
import type { Category, Product } from "@/lib/types";

type ImgItem = {
  key: string;
  id?: string;
  url: string;
  storage_path?: string | null;
  file?: File;
};

type VariantRow = {
  key: string;
  id?: string;
  size: string;
  color: string;
  stock: string;
};

const PRESETS: { label: string; sizes: string[] }[] = [
  { label: "S – XXL", sizes: ["S", "M", "L", "XL", "XXL"] },
  { label: "Waist 28 – 40", sizes: ["28", "30", "32", "34", "36", "38", "40"] },
  { label: "Free Size", sizes: ["Free Size"] },
];

const uid = () => Math.random().toString(36).slice(2);

export default function ProductForm({ product, categories }: { product?: Product; categories: Category[] }) {
  const router = useRouter();
  const isEdit = !!product;
  const fileInput = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [salePrice, setSalePrice] = useState(product?.sale_price != null ? String(product.sale_price) : "");
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false);

  const [images, setImages] = useState<ImgItem[]>(
    [...(product?.product_images ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => ({ key: i.id, id: i.id, url: i.image_url, storage_path: i.storage_path }))
  );
  const [removedImages, setRemovedImages] = useState<ImgItem[]>([]);

  const [variants, setVariants] = useState<VariantRow[]>(
    (product?.product_variants ?? []).map((v) => ({
      key: v.id,
      id: v.id,
      size: v.size,
      color: v.color,
      stock: String(v.stock),
    }))
  );
  const [removedVariantIds, setRemovedVariantIds] = useState<string[]>([]);
  const [quickColor, setQuickColor] = useState("");
  const [quickStock, setQuickStock] = useState("5");

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  function onName(v: string) {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({ key: uid(), url: URL.createObjectURL(file), file }));
    setImages((prev) => [...prev, ...next]);
    if (fileInput.current) fileInput.current.value = "";
  }

  function removeImage(key: string) {
    setImages((prev) => {
      const img = prev.find((i) => i.key === key);
      if (img?.id) setRemovedImages((r) => [...r, img]);
      return prev.filter((i) => i.key !== key);
    });
  }

  function moveImage(index: number, dir: -1 | 1) {
    setImages((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  function addPreset(sizes: string[]) {
    setVariants((prev) => {
      const existing = new Set(prev.map((v) => `${v.size}|${v.color}`));
      const add = sizes
        .filter((s) => !existing.has(`${s}|${quickColor.trim()}`))
        .map((s) => ({ key: uid(), size: s, color: quickColor.trim(), stock: quickStock || "0" }));
      return [...prev, ...add];
    });
  }

  function updateVariant(key: string, field: "size" | "color" | "stock", value: string) {
    setVariants((prev) => prev.map((v) => (v.key === key ? { ...v, [field]: value } : v)));
  }

  function removeVariant(key: string) {
    setVariants((prev) => {
      const v = prev.find((x) => x.key === key);
      if (v?.id) setRemovedVariantIds((r) => [...r, v.id!]);
      return prev.filter((x) => x.key !== key);
    });
  }

  function validate(): string | null {
    if (!name.trim()) return "Please enter a product name";
    if (!slugify(slug)) return "Please enter a URL (slug)";
    const p = Number(price);
    if (!price || Number.isNaN(p) || p <= 0) return "Please enter a valid price";
    if (salePrice) {
      const s = Number(salePrice);
      if (Number.isNaN(s) || s <= 0) return "Please enter a valid sale price";
      if (s >= p) return "Sale price must be lower than the regular price";
    }
    if (variants.length === 0) return "Add at least one size";
    const seen = new Set<string>();
    for (const v of variants) {
      if (!v.size.trim()) return "Every row needs a size";
      const n = Number(v.stock);
      if (!Number.isInteger(n) || n < 0) return `Enter a valid stock number for size ${v.size}`;
      const k = `${v.size.trim().toLowerCase()}|${v.color.trim().toLowerCase()}`;
      if (seen.has(k)) return `Size ${v.size}${v.color ? " / " + v.color : ""} is listed twice`;
      seen.add(k);
    }
    return null;
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setSaving(true);
    const supabase = createClient();
    let createdId: string | null = null;

    try {
      setStatus("Saving product…");
      const payload = {
        name: name.trim(),
        slug: slugify(slug),
        description: description.trim() || null,
        category_id: categoryId || null,
        price: Number(price),
        sale_price: salePrice ? Number(salePrice) : null,
        is_active: isActive,
        is_featured: isFeatured,
      };

      let productId = product?.id;
      if (isEdit) {
        const { error } = await supabase.from("products").update(payload).eq("id", productId!);
        if (error) throw error;
      } else {
        let res = await supabase.from("products").insert(payload).select("id").single();
        if (res.error?.code === "23505") {
          payload.slug = `${payload.slug}-${uid().slice(0, 4)}`;
          res = await supabase.from("products").insert(payload).select("id").single();
        }
        if (res.error) throw res.error;
        productId = res.data.id as string;
        createdId = productId;
      }

      setStatus("Saving sizes and stock…");
      if (removedVariantIds.length) {
        const { error } = await supabase.from("product_variants").delete().in("id", removedVariantIds);
        if (error) throw error;
      }
      for (const v of variants.filter((x) => x.id)) {
        const { error } = await supabase
          .from("product_variants")
          .update({ size: v.size.trim(), color: v.color.trim(), stock: Number(v.stock) })
          .eq("id", v.id!);
        if (error) throw error;
      }
      const newVariants = variants
        .filter((x) => !x.id)
        .map((v) => ({ product_id: productId, size: v.size.trim(), color: v.color.trim(), stock: Number(v.stock) }));
      if (newVariants.length) {
        const { error } = await supabase.from("product_variants").insert(newVariants);
        if (error) throw error;
      }

      if (removedImages.length) {
        setStatus("Removing old pictures…");
        await supabase.from("product_images").delete().in("id", removedImages.map((i) => i.id!));
        await deleteImages(supabase, removedImages.map((i) => i.storage_path));
      }

      let n = 0;
      const total = images.filter((i) => i.file).length;
      for (let index = 0; index < images.length; index++) {
        const img = images[index];
        if (img.file) {
          n++;
          setStatus(`Uploading picture ${n} of ${total}…`);
          const { path, url } = await uploadImage(supabase, img.file, productId!);
          const { error } = await supabase
            .from("product_images")
            .insert({ product_id: productId, image_url: url, storage_path: path, sort_order: index });
          if (error) throw error;
        } else if (img.id) {
          await supabase.from("product_images").update({ sort_order: index }).eq("id", img.id);
        }
      }

      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? "Something went wrong";
      if (createdId) {
        // The product was created but a later step failed: open its edit page to finish
        alert(`The product was saved, but there was a problem: ${msg}\nPlease check it on the edit page.`);
        router.replace(`/admin/products/${createdId}`);
        router.refresh();
        return;
      }
      setError(msg.includes("products_slug_key") ? "This URL (slug) is already used by another product" : msg);
      setSaving(false);
      setStatus("");
    }
  }

  async function onDelete() {
    if (!product) return;
    if (!confirm(`Permanently delete "${product.name}"?`)) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }
    await deleteImages(supabase, product.product_images.map((i) => i.storage_path));
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={onSave}>
      <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Products
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{isEdit ? "Edit product" : "New product"}</h1>
        {isEdit && product.is_active && (
          <Link href={`/product/${product.slug}`} target="_blank" className="text-sm text-brass hover:underline">
            View on website ↗
          </Link>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Basic info */}
          <section className="card space-y-4 p-5">
            <div>
              <label className="label" htmlFor="name">Product name *</label>
              <input id="name" className="input" value={name} onChange={(e) => onName(e.target.value)} placeholder="e.g. White Oxford Cotton Shirt" />
            </div>
            <div>
              <label className="label" htmlFor="slug">URL (slug)</label>
              <div className="flex items-center rounded-md border border-neutral-300 bg-neutral-50 text-sm">
                <span className="pl-3 text-neutral-500">/product/</span>
                <input
                  id="slug"
                  className="flex-1 bg-transparent px-1 py-2 outline-none"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="desc">Description</label>
              <textarea
                id="desc"
                rows={5}
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={"Fabric: 100% Cotton\nFit: Regular\nWash: Machine wash cold"}
              />
            </div>
          </section>

          {/* Images */}
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Pictures</h2>
              <span className="text-xs text-neutral-500">The first picture is the main picture</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((img, i) => (
                <div key={img.key} className="group relative aspect-[3/4] overflow-hidden rounded-md bg-sand">
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-ink px-1.5 py-0.5 text-[10px] font-bold text-white">MAIN</span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(img.key)}
                    className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-red-600 shadow"
                    aria-label="Remove picture"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/50 p-1">
                    <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} className="text-white disabled:opacity-30" aria-label="Move left">
                      <ArrowLeftCircle className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(i, 1)}
                      disabled={i === images.length - 1}
                      className="text-white disabled:opacity-30"
                      aria-label="Move right"
                    >
                      <ArrowRightCircle className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-neutral-300 text-sm text-neutral-500 hover:border-ink hover:text-ink"
              >
                <ImagePlus className="h-6 w-6" />
                Add pictures
              </button>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </section>

          {/* Variants */}
          <section className="card p-5">
            <h2 className="font-semibold">Sizes, colours & stock *</h2>
            <div className="mt-4 rounded-lg bg-neutral-50 p-4">
              <p className="text-sm font-medium">Quick add</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input className="input" placeholder="Colour (optional), e.g. White" value={quickColor} onChange={(e) => setQuickColor(e.target.value)} />
                <input
                  className="input"
                  type="number"
                  min={0}
                  placeholder="Stock per size"
                  value={quickStock}
                  onChange={(e) => setQuickStock(e.target.value)}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button key={p.label} type="button" onClick={() => addPreset(p.sizes)} className="btn-outline px-3 py-1.5 text-xs">
                    <Plus className="h-3 w-3" /> {p.label}
                  </button>
                ))}
              </div>
            </div>

            {variants.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-neutral-500">
                    <tr>
                      <th className="pb-2 pr-2">Size</th>
                      <th className="pb-2 pr-2">Color</th>
                      <th className="pb-2 pr-2">Stock</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v) => (
                      <tr key={v.key}>
                        <td className="py-1 pr-2">
                          <input className="input" value={v.size} onChange={(e) => updateVariant(v.key, "size", e.target.value)} />
                        </td>
                        <td className="py-1 pr-2">
                          <input className="input" value={v.color} placeholder="—" onChange={(e) => updateVariant(v.key, "color", e.target.value)} />
                        </td>
                        <td className="w-28 py-1 pr-2">
                          <input
                            className="input"
                            type="number"
                            min={0}
                            value={v.stock}
                            onChange={(e) => updateVariant(v.key, "stock", e.target.value)}
                          />
                        </td>
                        <td className="w-10 py-1">
                          <button type="button" onClick={() => removeVariant(v.key)} className="p-2 text-neutral-400 hover:text-red-600" aria-label="Remove">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button
              type="button"
              onClick={() => setVariants((p) => [...p, { key: uid(), size: "", color: quickColor.trim(), stock: "0" }])}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brass hover:underline"
            >
              <Plus className="h-4 w-4" /> Add a size
            </button>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <section className="card space-y-4 p-5">
            <div>
              <label className="label" htmlFor="price">Price (Rs.) *</label>
              <input id="price" type="number" min={0} className="input" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="sale">Sale price (Rs.)</label>
              <input
                id="sale"
                type="number"
                min={0}
                className="input"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="Leave empty if not on sale"
              />
            </div>
            <div>
              <label className="label" htmlFor="cat">Category</label>
              <select id="cat" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {categories.length === 0 && (
                <Link href="/admin/categories" className="mt-1 block text-xs text-brass hover:underline">
                  Create a category first →
                </Link>
              )}
            </div>
          </section>

          <section className="card space-y-3 p-5 text-sm">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" />
              <span>
                <span className="font-medium">Show on website</span>
                <span className="block text-xs text-neutral-500">Turn off to hide this product</span>
              </span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-4 w-4" />
              <span>
                <span className="font-medium">Featured</span>
                <span className="block text-xs text-neutral-500">Shown on the home page</span>
              </span>
            </label>
          </section>

          {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {status && <p className="text-sm text-neutral-600">{status}</p>}

          <button type="submit" disabled={saving} className="btn-primary w-full py-3">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Save product"}
          </button>
          {isEdit && (
            <button type="button" onClick={onDelete} disabled={saving} className="btn w-full text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" /> Delete product
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
