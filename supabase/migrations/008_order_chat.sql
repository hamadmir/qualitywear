-- =============================================================
-- Order chat + manual (offline) payment
-- Every order gets a private chat between the customer and the shop.
-- Customers have no account: they reach their chat with a secret
-- access token that is created with the order.
-- =============================================================

-- ---------- Orders: manual payment + secret access token ----------
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method in ('cod','online','manual'));
alter table public.orders alter column payment_method set default 'manual';
alter table public.orders add column if not exists access_token uuid not null default gen_random_uuid();
create unique index if not exists orders_access_token_idx on public.orders(access_token);

alter table public.settings add column if not exists payment_instructions text;

-- ---------- Messages ----------
create table if not exists public.order_messages (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  sender           text not null check (sender in ('customer','admin','system')),
  body             text not null default '' check (char_length(body) <= 2000),
  attachment_path  text,
  read_by_admin    boolean not null default true,
  read_by_customer boolean not null default false,
  created_at       timestamptz not null default now(),
  check (char_length(body) > 0 or attachment_path is not null)
);
create index if not exists order_messages_order_idx on public.order_messages(order_id, created_at);
create index if not exists order_messages_unread_idx on public.order_messages(order_id) where read_by_admin = false;
alter table public.order_messages enable row level security;
drop policy if exists "order messages admin all" on public.order_messages;
create policy "order messages admin all" on public.order_messages
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Payment screenshots (private bucket) ----------
create or replace function public.order_token_exists(p_token text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.orders where access_token::text = p_token);
$$;
revoke all on function public.order_token_exists(text) from public;
grant execute on function public.order_token_exists(text) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 10485760,
        array['image/jpeg','image/png','image/webp','image/heic','application/pdf'])
on conflict (id) do update set public = false;

drop policy if exists "payment proofs customer upload" on storage.objects;
create policy "payment proofs customer upload" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'payment-proofs' and public.order_token_exists((storage.foldername(name))[1]));
drop policy if exists "payment proofs admin read" on storage.objects;
create policy "payment proofs admin read" on storage.objects
  for select using (bucket_id = 'payment-proofs' and public.is_admin());
drop policy if exists "payment proofs admin delete" on storage.objects;
create policy "payment proofs admin delete" on storage.objects
  for delete using (bucket_id = 'payment-proofs' and public.is_admin());

-- ---------- place_order: manual payment, returns the chat token, opens the chat ----------
drop function if exists public.place_order(text,text,text,text,text,text,jsonb,text);
create or replace function public.place_order(
  p_customer_name text, p_phone text, p_email text, p_address text, p_city text, p_notes text, p_items jsonb,
  p_coupon text default null
)
returns table (order_number text, total numeric, access_token uuid)
language plpgsql security definer set search_path = public
as $$
declare
  v_order_id uuid; v_order_no text; v_token uuid; v_subtotal numeric(10,2) := 0; v_delivery numeric(10,2);
  v_free_above numeric(10,2); v_item jsonb; v_qty int; v_variant record; v_price numeric(10,2); v_image text;
  v_coupon public.coupons; v_discount numeric(10,2) := 0; v_coupon_code text; r record; v_total numeric(10,2);
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

  insert into public.orders (customer_name, phone, email, address, city, notes, subtotal, delivery_charge, total, payment_method)
  values (trim(p_customer_name), trim(p_phone), nullif(trim(coalesce(p_email,'')), ''),
          trim(p_address), trim(p_city), nullif(trim(coalesce(p_notes,'')), ''), 0, 0, 0, 'manual')
  returning id, orders.order_number, orders.access_token into v_order_id, v_order_no, v_token;

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
  v_total := v_subtotal - v_discount + v_delivery;

  update public.orders
     set subtotal = v_subtotal, discount = v_discount, coupon_code = v_coupon_code,
         delivery_charge = v_delivery, total = v_total
   where id = v_order_id;

  insert into public.order_messages (order_id, sender, body)
  values (v_order_id, 'system',
    'Thank you for your order ' || v_order_no || '! Your total is Rs. ' || to_char(v_total, 'FM999,999,999') || '. ' ||
    'We''ll confirm your items and share payment details right here in this chat. ' ||
    'You can pay by bank transfer, JazzCash or Easypaisa, then send us a screenshot of the payment.');

  return query select v_order_no, v_total, v_token;
end;
$$;
revoke all on function public.place_order(text,text,text,text,text,text,jsonb,text) from public;
grant execute on function public.place_order(text,text,text,text,text,text,jsonb,text) to anon, authenticated;

-- ---------- Customer: read their order + chat ----------
create or replace function public.get_order_chat(p_order_number text, p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  result jsonb;
begin
  select * into o from public.orders
   where upper(order_number) = upper(trim(p_order_number)) and access_token = p_token;
  if not found then
    return null;
  end if;

  update public.order_messages set read_by_customer = true
   where order_id = o.id and sender <> 'customer' and not read_by_customer;

  select jsonb_build_object(
    'order', jsonb_build_object(
      'order_number', o.order_number, 'status', o.status, 'payment_status', o.payment_status,
      'subtotal', o.subtotal, 'discount', o.discount, 'coupon_code', o.coupon_code,
      'delivery_charge', o.delivery_charge, 'total', o.total,
      'customer_name', o.customer_name, 'city', o.city, 'created_at', o.created_at,
      'items', coalesce((select jsonb_agg(jsonb_build_object(
          'product_name', oi.product_name, 'size', oi.size, 'color', oi.color,
          'quantity', oi.quantity, 'line_total', oi.line_total, 'image_url', oi.image_url) order by oi.product_name)
        from public.order_items oi where oi.order_id = o.id), '[]'::jsonb)
    ),
    'messages', coalesce((select jsonb_agg(jsonb_build_object(
          'id', m.id, 'sender', m.sender, 'body', m.body,
          'has_attachment', m.attachment_path is not null, 'created_at', m.created_at) order by m.created_at)
        from public.order_messages m where m.order_id = o.id), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.get_order_chat(text, uuid) from public;
grant execute on function public.get_order_chat(text, uuid) to anon, authenticated;

-- ---------- Customer: send a message (optionally with a payment screenshot) ----------
create or replace function public.send_order_message(p_order_number text, p_token uuid, p_body text, p_attachment_path text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  v_id uuid;
  v_body text := left(trim(coalesce(p_body, '')), 2000);
begin
  select * into o from public.orders
   where upper(order_number) = upper(trim(p_order_number)) and access_token = p_token;
  if not found then
    raise exception 'Order not found';
  end if;
  if v_body = '' and p_attachment_path is null then
    raise exception 'Message is empty';
  end if;
  if p_attachment_path is not null and split_part(p_attachment_path, '/', 1) <> o.access_token::text then
    raise exception 'Invalid attachment';
  end if;
  if (select count(*) from public.order_messages
       where order_id = o.id and sender = 'customer' and created_at > now() - interval '1 hour') >= 40 then
    raise exception 'Too many messages. Please wait a little and try again.';
  end if;

  insert into public.order_messages (order_id, sender, body, attachment_path, read_by_admin, read_by_customer)
  values (o.id, 'customer', v_body, p_attachment_path, false, true)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.send_order_message(text, uuid, text, text) from public;
grant execute on function public.send_order_message(text, uuid, text, text) to anon, authenticated;

-- ---------- Track order now also returns the chat token ----------
drop function if exists public.track_order(text, text);
create or replace function public.track_order(p_order_number text, p_phone text)
returns table (order_number text, status text, total numeric, created_at timestamptz,
               customer_name text, city text, items jsonb, access_token uuid)
language sql stable security definer set search_path = public as $$
  select o.order_number, o.status, o.total, o.created_at, o.customer_name, o.city,
         coalesce((select jsonb_agg(jsonb_build_object(
                     'product_name', oi.product_name, 'size', oi.size, 'color', oi.color,
                     'quantity', oi.quantity, 'line_total', oi.line_total, 'image_url', oi.image_url))
                   from public.order_items oi where oi.order_id = o.id), '[]'::jsonb),
         o.access_token
    from public.orders o
   where upper(o.order_number) = upper(trim(p_order_number))
     and regexp_replace(o.phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g');
$$;
revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;

-- ---------- Automatic chat messages when the order moves forward ----------
create or replace function public.order_status_messages()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  msg text;
begin
  if new.payment_status = 'paid' and old.payment_status <> 'paid' then
    insert into public.order_messages (order_id, sender, body)
    values (new.id, 'system', 'Payment received. Thank you!');
  end if;
  if new.status <> old.status then
    msg := case new.status
      when 'confirmed' then 'Your order is confirmed. We''re getting it ready for dispatch.'
      when 'shipped'   then 'Good news! Your order has been shipped. It usually arrives within 3–5 working days.'
      when 'delivered' then 'Your order has been delivered. Thank you for shopping with Quality Wear!'
      when 'cancelled' then 'This order has been cancelled. If you have any questions, just reply here.'
      else null end;
    if msg is not null then
      insert into public.order_messages (order_id, sender, body) values (new.id, 'system', msg);
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.order_status_messages() from public, anon, authenticated;
drop trigger if exists orders_status_messages on public.orders;
create trigger orders_status_messages after update of status, payment_status on public.orders
  for each row execute function public.order_status_messages();

-- ---------- Notify the shop owner when a customer writes ----------
create or replace function public.notify_customer_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
begin
  if new.sender = 'customer' then
    select * into o from public.orders where id = new.order_id;
    perform public.send_order_alert(
      'Message · ' || o.order_number || ' · ' || o.customer_name,
      case when new.attachment_path is not null and new.body = '' then 'Sent a payment screenshot'
           when new.attachment_path is not null then left(new.body, 120) || ' (with screenshot)'
           else left(new.body, 140) end,
      '/admin/orders/' || o.id);
  end if;
  return new;
exception when others then
  return new;
end;
$$;
revoke execute on function public.notify_customer_message() from public, anon, authenticated;
drop trigger if exists order_messages_notify on public.order_messages;
create trigger order_messages_notify after insert on public.order_messages
  for each row execute function public.notify_customer_message();

-- Payment details are private: kept in an admin-only table (settings is publicly readable)
alter table public.settings drop column if exists payment_instructions;
create table if not exists public.admin_settings (
  id int primary key default 1 check (id = 1),
  payment_instructions text,
  updated_at timestamptz not null default now()
);
insert into public.admin_settings (id) values (1) on conflict (id) do nothing;
alter table public.admin_settings enable row level security;
create policy "admin settings admin all" on public.admin_settings
  for all using (public.is_admin()) with check (public.is_admin());
