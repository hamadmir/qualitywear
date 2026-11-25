import type { OrderStatus, Product } from "./types";

export function rs(amount: number | string | null | undefined) {
  const n = Number(amount ?? 0);
  return "Rs. " + n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export function effectivePrice(p: Pick<Product, "price" | "sale_price">) {
  return p.sale_price != null ? Number(p.sale_price) : Number(p.price);
}

export function discountPercent(p: Pick<Product, "price" | "sale_price">) {
  if (p.sale_price == null) return 0;
  return Math.round((1 - Number(p.sale_price) / Number(p.price)) * 100);
}

export function sortedImages(p: Product) {
  return [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
}

export function mainImage(p: Product) {
  return sortedImages(p)[0]?.image_url ?? null;
}

export function totalStock(p: Product) {
  return (p.product_variants ?? []).reduce((s, v) => s + v.stock, 0);
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
  });
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export function whatsappLink(number: string | null | undefined, text: string) {
  if (!number) return null;
  let digits = number.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "92" + digits.slice(1);
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
