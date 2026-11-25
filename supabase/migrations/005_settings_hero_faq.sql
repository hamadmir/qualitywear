alter table public.settings
  add column if not exists hero_image_url text,
  add column if not exists faq_text text;
