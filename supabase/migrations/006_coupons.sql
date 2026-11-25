-- =============================================================
-- Discount coupons
-- =============================================================
create table if not exists public.coupons (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique check (code = upper(code) and char_length(code) between 3 and 30),
  description    text,
  discount_type  text not null check (discount_type in ('percent','fixed')),
  value          numeric(10,2) not null check (value > 0),
  max_discount   numeric(10,2) check (max_discount is null or max_discount > 0),
  min_order      numeric(10,2) not null default 0 check (min_order >= 0),
  max_uses       int check (max_uses is null or max_uses > 0),
  used_count     int not null default 0 check (used_count >= 0),
  starts_at      timestamptz,
  expires_at     timestamptz,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  constraint percent_max_100 check (discount_type <> 'percent' or value <= 100)
);
alter table public.coupons enable row level security;
drop policy if exists "coupons admin all" on public.coupons;
create policy "coupons admin all" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.orders
  add column if not exists coupon_code text,
  add column if not exists discount numeric(10,2) not null default 0;

-- Shared rule: returns the discount for a coupon row and subtotal, or an error message
create or replace function public.coupon_discount(c public.coupons, p_subtotal numeric, out discount numeric, out message text)
language plpgsql stable set search_path = public as $$
begin
  discount := 0;
  if not c.is_active then message := 'This coupon is no longer active'; return; end if;
  if c.starts_at is not null and c.starts_at > now() then message := 'This coupon is not active yet'; return; end if;
  if c.expires_at is not null and c.expires_at <= now() then message := 'This coupon has expired'; return; end if;
  if c.max_uses is not null and c.used_count >= c.max_uses then message := 'This coupon has reached its usage limit'; return; end if;
  if p_subtotal < c.min_order then
    message := 'Add items worth Rs. ' || to_char(c.min_order, 'FM999,999,999') || ' or more to use this coupon';
    return;
  end if;
  if c.discount_type = 'percent' then
    discount := round(p_subtotal * c.value / 100);
    if c.max_discount is not null then discount := least(discount, c.max_discount); end if;
  else
    discount := least(c.value, p_subtotal);
  end if;
  message := null;
end;
$$;
revoke all on function public.coupon_discount(public.coupons, numeric) from public, anon, authenticated;

-- Checkout preview: is this code valid for this subtotal?
create or replace function public.validate_coupon(p_code text, p_subtotal numeric)
returns table (valid boolean, code text, discount numeric, message text)
language plpgsql stable security definer set search_path = public as $$
declare
  c public.coupons;
  r record;
begin
  select * into c from public.coupons where coupons.code = upper(trim(p_code));
  if not found then
    return query select false, upper(trim(p_code)), 0::numeric, 'This coupon code is not valid'::text;
    return;
  end if;
  select * into r from public.coupon_discount(c, coalesce(p_subtotal, 0));
  return query select r.message is null, c.code, r.discount, coalesce(r.message, 'Coupon applied');
end;
$$;
revoke all on function public.validate_coupon(text, numeric) from public;
grant execute on function public.validate_coupon(text, numeric) to anon, authenticated;

-- place_order with optional coupon (prices, stock and discount are all computed here)
drop function if exists public.place_order(text,text,text,text,text,text,jsonb);
create or replace function public.place_order(
  p_customer_name text, p_phone text, p_email text, p_address text, p_city text, p_notes text, p_items jsonb,
  p_coupon text default null
)
returns table (order_number text, total numeric)
language plpgsql security definer set search_path = public
as $$
declare
  v_order_id uuid; v_order_no text; v_subtotal numeric(10,2) := 0; v_delivery numeric(10,2);
  v_free_above numeric(10,2); v_item jsonb; v_qty int; v_variant record; v_price numeric(10,2); v_image text;
  v_coupon public.coupons; v_discount numeric(10,2) := 0; v_coupon_code text; r record;
begin
  if coalesce(trim(p_customer_name), '') = '' or coalesce(trim(p_phone), '') = ''
     or coalesce(trim(p_address), '') = '' or coalesce(trim(p_city), '') = '' then
    raise exception 'Name, phone, address and city are required';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'Too many items in one order';
  end if;

  select s.delivery_charge, s.free_delivery_above into v_delivery, v_free_above from public.settings s where s.id = 1;

  insert into public.orders (customer_name, phone, email, address, city, notes, subtotal, delivery_charge, total)
  values (trim(p_customer_name), trim(p_phone), nullif(trim(coalesce(p_email,'')), ''),
          trim(p_address), trim(p_city), nullif(trim(coalesce(p_notes,'')), ''), 0, 0, 0)
  returning id, orders.order_number into v_order_id, v_order_no;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty < 1 or v_qty > 20 then
      raise exception 'Invalid quantity';
    end if;

    select v.id, v.size, v.color, v.stock, p.id as product_id, p.name, p.price, p.sale_price, p.is_active
      into v_variant
      from public.product_variants v join public.products p on p.id = v.product_id
     where v.id = (v_item->>'variant_id')::uuid
     for update of v;

    if not found or not v_variant.is_active then
      raise exception 'A product in your cart is no longer available';
    end if;
    if v_variant.stock < v_qty then
      raise exception 'Only % left in stock for % (size %)', v_variant.stock, v_variant.name, v_variant.size;
    end if;

    v_price := coalesce(v_variant.sale_price, v_variant.price);
    select pi.image_url into v_image from public.product_images pi
     where pi.product_id = v_variant.product_id order by pi.sort_order limit 1;

    update public.product_variants set stock = stock - v_qty where id = v_variant.id;

    insert into public.order_items (order_id, product_id, variant_id, product_name, image_url, size, color, unit_price, quantity, line_total)
    values (v_order_id, v_variant.product_id, v_variant.id, v_variant.name, v_image,
            v_variant.size, nullif(v_variant.color, ''), v_price, v_qty, v_price * v_qty);

    v_subtotal := v_subtotal + v_price * v_qty;
  end loop;

  if nullif(trim(coalesce(p_coupon, '')), '') is not null then
    select * into v_coupon from public.coupons where code = upper(trim(p_coupon)) for update;
    if not found then
      raise exception 'This coupon code is not valid';
    end if;
    select * into r from public.coupon_discount(v_coupon, v_subtotal);
    if r.message is not null then
      raise exception '%', r.message;
    end if;
    v_discount := r.discount;
    v_coupon_code := v_coupon.code;
    update public.coupons set used_count = used_count + 1 where id = v_coupon.id;
  end if;

  if v_free_above is not null and v_subtotal >= v_free_above then v_delivery := 0; end if;

  update public.orders
     set subtotal = v_subtotal, discount = v_discount, coupon_code = v_coupon_code,
         delivery_charge = v_delivery, total = v_subtotal - v_discount + v_delivery
   where id = v_order_id;

  return query select v_order_no, v_subtotal - v_discount + v_delivery;
end;
$$;
revoke all on function public.place_order(text,text,text,text,text,text,jsonb,text) from public;
grant execute on function public.place_order(text,text,text,text,text,text,jsonb,text) to anon, authenticated;

-- Cancelling an order returns stock and frees up the coupon use
create or replace function public.restock_on_cancel()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.product_variants v set stock = v.stock + oi.quantity
      from public.order_items oi where oi.order_id = new.id and oi.variant_id = v.id;
    if new.coupon_code is not null then
      update public.coupons set used_count = greatest(used_count - 1, 0) where code = new.coupon_code;
    end if;
  elsif old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'A cancelled order cannot be reopened';
  end if;
  return new;
end;
$$;
revoke execute on function public.restock_on_cancel() from public, anon, authenticated;
