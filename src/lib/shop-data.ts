import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Category, Settings } from "@/lib/types";

const DEFAULT_SETTINGS: Settings = {
  id: 1,
  shop_name: "Quality Wear",
  whatsapp_number: null,
  delivery_charge: 250,
  free_delivery_above: null,
  phone: null,
  email: null,
  address: null,
  map_link: null,
  opening_hours: null,
  instagram_url: null,
  facebook_url: null,
  tiktok_url: null,
  about_text: null,
  hero_image_url: null,
  ga_measurement_id: null,
  meta_pixel_id: null,
  faq_text: null,
};

export const getSettings = cache(async (): Promise<Settings> => {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
  return (data as Settings) ?? DEFAULT_SETTINGS;
});

export const getCategories = cache(async (): Promise<Category[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");
  return (data as Category[]) ?? [];
});
