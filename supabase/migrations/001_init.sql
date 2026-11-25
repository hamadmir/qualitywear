-- =============================================================
-- Quality Wear — Supabase database schema
-- Tables, security (RLS), order placing function, image storage
-- =============================================================

-- ---------- Admins ----------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- Settings (delivery charges, shop info) ----------
create table if not exists public.settings (
  id                   int primary key default 1 check (id = 1),
  shop_name            text not null default 'Quality Wear',
  whatsapp_number      text,
  delivery_charge      numeric(10,2) not null default 250 check (delivery_charge >= 0),
  free_delivery_above  numeric(10,2) check (free_delivery_above is null or free_delivery_above >= 0),
  updated_at           timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ---------- Categories ----------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  image_url   text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------- Products ----------
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  description  text,
  category_id  uuid references public.categories(id) on delete set null,
  price        numeric(10,2) not null check (price >= 0),
  sale_price   numeric(10,2) check (sale_price is null or (sale_price >= 0 and sale_price < price)),
  is_active    boolean not null default true,
  is_featured  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_active_idx on public.products(is_active, created_at desc);

create table if not exists public.product_images (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  image_url     text not null,
  storage_path  text,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists product_images_product_idx on public.product_images(product_id, sort_order);

create table if not exists public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  size        text not null,
  color       text not null default '',
  stock       int not null default 0 check (stock >= 0),
  sku         text,
  created_at  timestamptz not null default now(),
  unique (product_id, size, color)
);
create index if not exists product_variants_product_idx on public.product_variants(product_id);

-- ---------- Orders ----------
create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique default ('QW-' || nextval('public.order_number_seq')::text),
  customer_name    text not null,
  phone            text not null,
  email            text,
  address          text not null,
  city             text not null,
  notes            text,
  subtotal         numeric(10,2) not null,
  delivery_charge  numeric(10,2) not null default 0,
  total            numeric(10,2) not null,
  payment_method   text not null default 'cod' check (payment_method in ('cod','online')),
  payment_status   text not null default 'unpaid' check (payment_status in ('unpaid','paid','refunded')),
  status           text not null default 'pending'
                   check (status in ('pending','confirmed','shipped','delivered','cancelled')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists orders_created_idx on public.orders(created_at desc);
create index if not exists orders_status_idx on public.orders(status);

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_id    uuid references public.products(id) on delete set null,
  variant_id    uuid references public.product_variants(id) on delete set null,
  product_name  text not null,
  image_url     text,
  size          text,
  color         text,
  unit_price    numeric(10,2) not null,
  quantity      int not null check (quantity > 0),
  line_total    numeric(10,2) not null
);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- ---------- updated_at triggers ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();
drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

-- =============================================================
-- Row Level Security
-- Customers: read active catalog only. Admin: everything.
-- Orders are created only through place_order() below.
-- =============================================================
alter table public.admins           enable row level security;
alter table public.settings         enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.product_images   enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;

-- admins
drop policy if exists "admins read self" on public.admins;
create policy "admins read self" on public.admins
  for select using (user_id = auth.uid());

-- settings
drop policy if exists "settings public read" on public.settings;
create policy "settings public read" on public.settings for select using (true);
drop policy if exists "settings admin write" on public.settings;
create policy "settings admin write" on public.settings
  for update using (public.is_admin()) with check (public.is_admin());

-- categories
drop policy if exists "categories public read" on public.categories;
create policy "categories public read" on public.categories
  for select using (is_active or public.is_admin());
drop policy if exists "categories admin all" on public.categories;
create policy "categories admin all" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- products
drop policy if exists "products public read" on public.products;
create policy "products public read" on public.products
  for select using (is_active or public.is_admin());
drop policy if exists "products admin all" on public.products;
create policy "products admin all" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- product_images
drop policy if exists "images public read" on public.product_images;
create policy "images public read" on public.product_images
  for select using (
    public.is_admin() or exists (
      select 1 from public.products p where p.id = product_id and p.is_active
    )
  );
drop policy if exists "images admin all" on public.product_images;
create policy "images admin all" on public.product_images
  for all using (public.is_admin()) with check (public.is_admin());

-- product_variants
drop policy if exists "variants public read" on public.product_variants;
create policy "variants public read" on public.product_variants
  for select using (
    public.is_admin() or exists (
      select 1 from public.products p where p.id = product_id and p.is_active
    )
  );
drop policy if exists "variants admin all" on public.product_variants;
create policy "variants admin all" on public.product_variants
  for all using (public.is_admin()) with check (public.is_admin());

-- orders / order_items: admin only (customers go through functions)
drop policy if exists "orders admin all" on public.orders;
create policy "orders admin all" on public.orders
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "order_items admin all" on public.order_items;
create policy "order_items admin all" on public.order_items
  for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================
-- place_order: customer checkout.
-- Prices and stock are read from the database (never trusted
-- from the browser). Stock is reduced atomically.
-- items: [{ "variant_id": "...", "quantity": 2 }, ...]
-- =============================================================
create or replace function public.place_order(
  p_customer_name text,
  p_phone         text,
  p_email         text,
  p_address       text,
  p_city          text,
  p_notes         text,
  p_items         jsonb
)
returns table (order_number text, total numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id   uuid;
  v_order_no   text;
  v_subtotal   numeric(10,2) := 0;
  v_delivery   numeric(10,2);
  v_free_above numeric(10,2);
  v_item       jsonb;
  v_qty        int;
  v_variant    record;
  v_price      numeric(10,2);
  v_image      text;
begin
  if coalesce(trim(p_customer_name), '') = '' or coalesce(trim(p_phone), '') = ''
     or coalesce(trim(p_address), '') = '' or coalesce(trim(p_city), '') = '' then
    raise exception 'Naam, phone, address aur city zaroori hain';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart khaali hai';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'Bohat zyada items';
  end if;

  select s.delivery_charge, s.free_delivery_above into v_delivery, v_free_above
  from public.settings s where s.id = 1;

  insert into public.orders (customer_name, phone, email, address, city, notes,
                             subtotal, delivery_charge, total)
  values (trim(p_customer_name), trim(p_phone), nullif(trim(coalesce(p_email,'')), ''),
          trim(p_address), trim(p_city), nullif(trim(coalesce(p_notes,'')), ''), 0, 0, 0)
  returning id, orders.order_number into v_order_id, v_order_no;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty < 1 or v_qty > 20 then
      raise exception 'Ghalat quantity';
    end if;

    select v.id, v.size, v.color, v.stock, p.id as product_id, p.name,
           p.price, p.sale_price, p.is_active
      into v_variant
      from public.product_variants v
      join public.products p on p.id = v.product_id
     where v.id = (v_item->>'variant_id')::uuid
     for update of v;

    if not found or not v_variant.is_active then
      raise exception 'Product dastiyab nahi';
    end if;
    if v_variant.stock < v_qty then
      raise exception '% (%) ka stock sirf % bacha hai', v_variant.name, v_variant.size, v_variant.stock;
    end if;

    v_price := coalesce(v_variant.sale_price, v_variant.price);

    select pi.image_url into v_image
      from public.product_images pi
     where pi.product_id = v_variant.product_id
     order by pi.sort_order limit 1;

    update public.product_variants set stock = stock - v_qty where id = v_variant.id;

    insert into public.order_items (order_id, product_id, variant_id, product_name, image_url,
                                    size, color, unit_price, quantity, line_total)
    values (v_order_id, v_variant.product_id, v_variant.id, v_variant.name, v_image,
            v_variant.size, nullif(v_variant.color, ''), v_price, v_qty, v_price * v_qty);

    v_subtotal := v_subtotal + v_price * v_qty;
  end loop;

  if v_free_above is not null and v_subtotal >= v_free_above then
    v_delivery := 0;
  end if;

  update public.orders
     set subtotal = v_subtotal, delivery_charge = v_delivery, total = v_subtotal + v_delivery
   where id = v_order_id;

  return query select v_order_no, v_subtotal + v_delivery;
end;
$$;

-- Restock when admin cancels an order
create or replace function public.restock_on_cancel()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.product_variants v
       set stock = v.stock + oi.quantity
      from public.order_items oi
     where oi.order_id = new.id and oi.variant_id = v.id;
  elsif old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'Cancelled order dobara open nahi ho sakta';
  end if;
  return new;
end;
$$;
drop trigger if exists orders_restock on public.orders;
create trigger orders_restock after update of status on public.orders
  for each row execute function public.restock_on_cancel();

-- =============================================================
-- track_order: customer checks status with order number + phone
-- =============================================================
create or replace function public.track_order(p_order_number text, p_phone text)
returns table (order_number text, status text, total numeric, created_at timestamptz,
               customer_name text, city text, items jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select o.order_number, o.status, o.total, o.created_at, o.customer_name, o.city,
         coalesce((select jsonb_agg(jsonb_build_object(
                     'product_name', oi.product_name, 'size', oi.size, 'color', oi.color,
                     'quantity', oi.quantity, 'line_total', oi.line_total, 'image_url', oi.image_url))
                   from public.order_items oi where oi.order_id = o.id), '[]'::jsonb)
    from public.orders o
   where upper(o.order_number) = upper(trim(p_order_number))
     and regexp_replace(o.phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g');
$$;

revoke all on function public.place_order(text,text,text,text,text,text,jsonb) from public;
grant execute on function public.place_order(text,text,text,text,text,text,jsonb) to anon, authenticated;
revoke all on function public.track_order(text,text) from public;
grant execute on function public.track_order(text,text) to anon, authenticated;

-- =============================================================
-- Storage: product pictures (public read, admin upload)
-- =============================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "product images public read" on storage.objects;
create policy "product images public read" on storage.objects
  for select using (bucket_id = 'product-images');
drop policy if exists "product images admin insert" on storage.objects;
create policy "product images admin insert" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product images admin update" on storage.objects;
create policy "product images admin update" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product images admin delete" on storage.objects;
create policy "product images admin delete" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());
