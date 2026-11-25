export type Category = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
};

export type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  storage_path: string | null;
  sort_order: number;
};

export type Variant = {
  id: string;
  product_id: string;
  size: string;
  color: string;
  stock: number;
  sku: string | null;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  price: number;
  sale_price: number | null;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  product_images: ProductImage[];
  product_variants: Variant[];
  categories?: { name: string; slug: string } | null;
};

export type Settings = {
  id: number;
  shop_name: string;
  whatsapp_number: string | null;
  delivery_charge: number;
  free_delivery_above: number | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  map_link: string | null;
  opening_hours: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  about_text: string | null;
  hero_image_url: string | null;
  faq_text: string | null;
};

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_url: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ContactMessage = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  subject: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  image_url: string | null;
  size: string | null;
  color: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  notes: string | null;
  subtotal: number;
  delivery_charge: number;
  total: number;
  payment_method: "cod" | "online";
  payment_status: "unpaid" | "paid" | "refunded";
  status: OrderStatus;
  created_at: string;
  order_items?: OrderItem[];
};

export const PRODUCT_SELECT =
  "*, product_images(*), product_variants(*), categories(name, slug)";

export type StoreMedia = {
  id: string;
  media_type: "image" | "video";
  url: string;
  storage_path: string | null;
  caption: string | null;
  sort_order: number;
  created_at: string;
};
