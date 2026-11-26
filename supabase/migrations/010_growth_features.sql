-- 010: customer notifications, courier tracking, reviews, size charts, back-in-stock alerts,
--      unpaid order automation, analytics IDs

-- =====================================================================
-- Generic push sender (admin devices, an order's customer, or stock alert subscribers)
-- =====================================================================
create or replace function public.send_push(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://jgehgvehlgpwtkkstuea.supabase.co/functions/v1/order-alert',
    body := p,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-qw-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'qw_alert_secret')
    ),
    timeout_milliseconds := 10000
  );
exception when others then
  null; -- never block the original action because of a notification
end;
$$;
revoke execute on function public.send_push(jsonb) from public, anon, authenticated;

create or replace function public.send_order_alert(p_title text, p_body text, p_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.send_push(jsonb_build_object('audience', 'admin', 'title', p_title, 'body', p_body, 'url', p_url));
end;
$$;
revoke execute on function public.send_order_alert(text, text, text) from public, anon, authenticated;

-- =====================================================================
-- Orders: courier tracking + reminder bookkeeping
-- =====================================================================
alter table public.orders
  add column if not exists courier text check (courier is null or char_length(courier) <= 60),
  add column if not exists tracking_number text check (tracking_number is null or char_length(tracking_number) <= 80),
  add column if not exists tracking_url text check (tracking_url is null or (char_length(tracking_url) <= 500 and tracking_url ~ '^https?://')),
  add column if not exists reminder_sent_at timestamptz;

alter table public.admin_settings
  add column if not exists reminder_hours int default 24 check (reminder_hours is null or reminder_hours between 1 and 720),
  add column if not exists auto_cancel_hours int default 72 check (auto_cancel_hours is null or auto_cancel_hours between 6 and 2160);
update public.admin_settings set reminder_hours = coalesce(reminder_hours, 24), auto_cancel_hours = coalesce(auto_cancel_hours, 72) where id = 1;

-- =====================================================================
-- Customer push subscriptions (one per order per device)
-- =====================================================================
create table if not exists public.customer_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (order_id, endpoint)
);
alter table public.customer_push_subscriptions enable row level security;
drop policy if exists "customer push admin read" on public.customer_push_subscriptions;
create policy "customer push admin read" on public.customer_push_subscriptions for select using (public.is_admin());

create or replace function public.save_customer_push(p_order_number text, p_token uuid, p_endpoint text, p_p256dh text, p_auth text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from public.orders where upper(order_number) = upper(trim(p_order_number)) and access_token = p_token;
  if v_id is null then raise exception 'Order not found'; end if;
  if p_endpoint !~ '^https://' or char_length(p_endpoint) > 1000 or char_length(coalesce(p_p256dh,'')) > 200
     or char_length(coalesce(p_auth,'')) > 100 or coalesce(p_p256dh,'') = '' or coalesce(p_auth,'') = '' then
    raise exception 'Invalid subscription';
  end if;
  insert into public.customer_push_subscriptions (order_id, endpoint, p256dh, auth)
  values (v_id, p_endpoint, p_p256dh, p_auth)
  on conflict (order_id, endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth;
  return true;
end;
$$;
revoke all on function public.save_customer_push(text, uuid, text, text, text) from public;
grant execute on function public.save_customer_push(text, uuid, text, text, text) to anon, authenticated;

-- Messages: notify admin about customer messages, and the customer about shop/system messages
create or replace function public.notify_customer_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
begin
  select * into o from public.orders where id = new.order_id;
  if new.sender = 'customer' then
    perform public.send_order_alert(
      'Message · ' || o.order_number || ' · ' || o.customer_name,
      case when new.attachment_path is not null and new.body = '' then 'Sent a payment screenshot'
           when new.attachment_path is not null then left(new.body, 120) || ' (with screenshot)'
           else left(new.body, 140) end,
      '/admin/orders/' || o.id);
  elsif exists (select 1 from public.customer_push_subscriptions s where s.order_id = o.id) then
    perform public.send_push(jsonb_build_object(
      'audience', 'order',
      'order_id', o.id,
      'title', 'Quality Wear · ' || o.order_number,
      'body', left(case when new.body = '' then 'New message about your order' else new.body end, 160),
      'url', '/order/' || o.order_number || '?t=' || o.access_token));
  end if;
  return new;
exception when others then
  return new;
end;
$$;
revoke execute on function public.notify_customer_message() from public, anon, authenticated;

-- Status messages, now with courier details and an explanation for automatic cancellations
create or replace function public.order_status_messages()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  msg text;
  tracking text := '';
begin
  if new.courier is not null then tracking := tracking || ' with ' || new.courier; end if;

  if new.payment_status = 'paid' and old.payment_status <> 'paid' then
    insert into public.order_messages (order_id, sender, body) values (new.id, 'system', 'Payment received. Thank you!');
  end if;

  if new.status <> old.status then
    msg := case new.status
      when 'confirmed' then 'Your order is confirmed. We''re getting it ready for dispatch.'
      when 'shipped'   then 'Good news! Your order has been shipped' || tracking || '.'
                            || coalesce(E'\nTracking number: ' || new.tracking_number, '')
                            || coalesce(E'\nTrack your parcel: ' || new.tracking_url, '')
                            || E'\nIt usually arrives within 3–5 working days.'
      when 'delivered' then 'Your order has been delivered. Thank you for shopping with Quality Wear! We''d love to hear what you think: you can now leave a review for your items on this page.'
      when 'cancelled' then case when current_setting('qw.auto_cancel', true) = '1'
                              then 'We didn''t receive payment for this order, so it has been cancelled automatically and the items have been released. You''re welcome to place a new order anytime.'
                              else 'This order has been cancelled. If you have any questions, just reply here.' end
      else null end;
    if msg is not null then
      insert into public.order_messages (order_id, sender, body) values (new.id, 'system', msg);
    end if;
  elsif new.status = 'shipped'
     and (new.tracking_number is distinct from old.tracking_number or new.tracking_url is distinct from old.tracking_url
          or new.courier is distinct from old.courier)
     and (new.tracking_number is not null or new.tracking_url is not null) then
    insert into public.order_messages (order_id, sender, body) values (new.id, 'system',
      'Tracking details updated' || tracking || '.'
      || coalesce(E'\nTracking number: ' || new.tracking_number, '')
      || coalesce(E'\nTrack your parcel: ' || new.tracking_url, ''));
  end if;
  return new;
end;
$$;
revoke execute on function public.order_status_messages() from public, anon, authenticated;
drop trigger if exists orders_status_messages on public.orders;
create trigger orders_status_messages after update of status, payment_status, courier, tracking_number, tracking_url on public.orders
  for each row execute function public.order_status_messages();

-- =====================================================================
-- Reviews (verified buyers only, approved by admin before showing)
-- =====================================================================
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  customer_name text not null check (char_length(customer_name) <= 60),
  city text check (city is null or char_length(city) <= 60),
  rating int not null check (rating between 1 and 5),
  body text check (body is null or char_length(body) <= 2000),
  photos text[] not null default '{}' check (cardinality(photos) <= 4),
  is_approved boolean not null default false,
  admin_reply text check (admin_reply is null or char_length(admin_reply) <= 1000),
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);
create index if not exists product_reviews_product_idx on public.product_reviews(product_id, is_approved, created_at desc);
alter table public.product_reviews enable row level security;
drop policy if exists "reviews public read approved" on public.product_reviews;
create policy "reviews public read approved" on public.product_reviews for select using (is_approved or public.is_admin());
drop policy if exists "reviews admin all" on public.product_reviews;
create policy "reviews admin all" on public.product_reviews for all using (public.is_admin()) with check (public.is_admin());

-- Review photos live in a folder named after a one-way hash of the order token,
-- so public photo URLs never reveal the token itself.
create or replace function public.review_folder_exists(p_folder text)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select p_folder ~ '^[0-9a-f]{64}$'
     and exists (select 1 from public.orders o
                  where encode(extensions.digest(o.access_token::text, 'sha256'), 'hex') = p_folder
                    and o.status in ('shipped', 'delivered'));
$$;
revoke all on function public.review_folder_exists(text) from public;
grant execute on function public.review_folder_exists(text) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-photos', 'review-photos', true, 6291456, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "review photos customer upload" on storage.objects;
create policy "review photos customer upload" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'review-photos' and public.review_folder_exists((storage.foldername(name))[1]));
drop policy if exists "review photos admin delete" on storage.objects;
create policy "review photos admin delete" on storage.objects
  for delete using (bucket_id = 'review-photos' and public.is_admin());

create or replace function public.submit_review(
  p_order_number text, p_token uuid, p_product_id uuid, p_rating int, p_body text, p_photos text[] default '{}'
) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare
  o public.orders;
  v_folder text;
  v_id uuid;
  v_name text;
  p text;
begin
  select * into o from public.orders where upper(order_number) = upper(trim(p_order_number)) and access_token = p_token;
  if not found then raise exception 'Order not found'; end if;
  if o.status not in ('shipped', 'delivered') then raise exception 'You can review your items once your order has been shipped'; end if;
  if not exists (select 1 from public.order_items where order_id = o.id and product_id = p_product_id) then
    raise exception 'This product is not part of your order';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'Please choose a rating from 1 to 5 stars'; end if;
  if char_length(coalesce(p_body, '')) > 2000 then raise exception 'Your review is too long'; end if;
  p_photos := coalesce(p_photos, '{}');
  if cardinality(p_photos) > 4 then raise exception 'You can add up to 4 photos'; end if;
  v_folder := encode(digest(p_token::text, 'sha256'), 'hex');
  foreach p in array p_photos loop
    if p !~ ('^' || v_folder || '/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$') then raise exception 'Invalid photo'; end if;
  end loop;
  v_name := split_part(trim(o.customer_name), ' ', 1);

  insert into public.product_reviews (product_id, order_id, customer_name, city, rating, body, photos)
  values (p_product_id, o.id, left(v_name, 60), left(o.city, 60), p_rating, nullif(trim(coalesce(p_body, '')), ''), p_photos)
  on conflict (order_id, product_id) do update
    set rating = excluded.rating, body = excluded.body, photos = excluded.photos,
        is_approved = false, created_at = now()
  returning id into v_id;

  perform public.send_order_alert(
    'New ' || p_rating || '★ review · ' || o.order_number,
    coalesce(left(nullif(trim(p_body), ''), 140), 'A customer left a rating'),
    '/admin/reviews');
  return v_id;
end;
$$;
revoke all on function public.submit_review(text, uuid, uuid, int, text, text[]) from public;
grant execute on function public.submit_review(text, uuid, uuid, int, text, text[]) to anon, authenticated;

-- Order chat payload: courier details, items with review status
create or replace function public.get_order_chat(p_order_number text, p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  result jsonb;
begin
  select * into o from public.orders
   where upper(order_number) = upper(trim(p_order_number)) and access_token = p_token;
  if not found then return null; end if;

  update public.order_messages set read_by_customer = true
   where order_id = o.id and sender <> 'customer' and not read_by_customer;

  select jsonb_build_object(
    'order', jsonb_build_object(
      'order_number', o.order_number, 'status', o.status, 'payment_status', o.payment_status,
      'subtotal', o.subtotal, 'discount', o.discount, 'coupon_code', o.coupon_code,
      'delivery_charge', o.delivery_charge, 'total', o.total,
      'customer_name', o.customer_name, 'city', o.city, 'created_at', o.created_at,
      'courier', o.courier, 'tracking_number', o.tracking_number, 'tracking_url', o.tracking_url,
      'items', coalesce((select jsonb_agg(jsonb_build_object(
          'product_id', oi.product_id, 'product_slug', pr.slug,
          'product_name', oi.product_name, 'size', oi.size, 'color', oi.color,
          'quantity', oi.quantity, 'line_total', oi.line_total, 'image_url', oi.image_url,
          'review', (select jsonb_build_object('rating', r.rating, 'approved', r.is_approved)
                       from public.product_reviews r where r.order_id = o.id and r.product_id = oi.product_id))
          order by oi.product_name)
        from public.order_items oi left join public.products pr on pr.id = oi.product_id
        where oi.order_id = o.id), '[]'::jsonb)
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

-- =====================================================================
-- Size charts per category
-- =====================================================================
alter table public.categories add column if not exists size_chart text check (size_chart is null or char_length(size_chart) <= 4000);

-- =====================================================================
-- Back-in-stock alerts
-- =====================================================================
create table if not exists public.stock_alerts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  name text check (name is null or char_length(name) <= 60),
  phone text not null check (phone ~ '^\+?[0-9]{10,15}$'),
  endpoint text,
  p256dh text,
  auth text,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  unique (variant_id, phone)
);
create index if not exists stock_alerts_variant_idx on public.stock_alerts(variant_id) where notified_at is null;
alter table public.stock_alerts enable row level security;
drop policy if exists "stock alerts admin all" on public.stock_alerts;
create policy "stock alerts admin all" on public.stock_alerts for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.create_stock_alert(
  p_variant_id uuid, p_name text, p_phone text, p_endpoint text default null, p_p256dh text default null, p_auth text default null
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  v record;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
begin
  if v_phone !~ '^\+?[0-9]{10,15}$' then raise exception 'Please enter a valid WhatsApp number'; end if;
  select pv.id, pv.product_id, pv.stock, p.is_active into v
    from public.product_variants pv join public.products p on p.id = pv.product_id where pv.id = p_variant_id;
  if not found or not v.is_active then raise exception 'This product is not available'; end if;
  if (select count(*) from public.stock_alerts where phone = v_phone and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many requests. Please try again later.';
  end if;
  if p_endpoint is not null and (p_endpoint !~ '^https://' or char_length(p_endpoint) > 1000
      or char_length(coalesce(p_p256dh, '')) > 200 or char_length(coalesce(p_auth, '')) > 100) then
    p_endpoint := null;
  end if;
  insert into public.stock_alerts (product_id, variant_id, name, phone, endpoint, p256dh, auth)
  values (v.product_id, v.id, nullif(left(trim(coalesce(p_name, '')), 60), ''), v_phone,
          p_endpoint, case when p_endpoint is null then null else p_p256dh end, case when p_endpoint is null then null else p_auth end)
  on conflict (variant_id, phone) do update
    set name = coalesce(excluded.name, stock_alerts.name),
        endpoint = coalesce(excluded.endpoint, stock_alerts.endpoint),
        p256dh = coalesce(excluded.p256dh, stock_alerts.p256dh),
        auth = coalesce(excluded.auth, stock_alerts.auth),
        notified_at = null, created_at = now();
  return true;
end;
$$;
revoke all on function public.create_stock_alert(uuid, text, text, text, text, text) from public;
grant execute on function public.create_stock_alert(uuid, text, text, text, text, text) to anon, authenticated;

create or replace function public.notify_back_in_stock()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ids uuid[];
  push_ids uuid[];
  p public.products;
begin
  if coalesce(old.stock, 0) <= 0 and new.stock > 0 then
    select array_agg(id), array_agg(id) filter (where endpoint is not null) into ids, push_ids
      from public.stock_alerts where variant_id = new.id and notified_at is null;
    if ids is null then return new; end if;
    select * into p from public.products where id = new.product_id;
    if push_ids is not null then
      perform public.send_push(jsonb_build_object(
        'audience', 'stock', 'alert_ids', to_jsonb(push_ids),
        'title', 'Back in stock',
        'body', p.name || ' (size ' || new.size || coalesce(', ' || nullif(new.color, ''), '') || ') is back. Grab it before it sells out!',
        'url', '/product/' || p.slug));
    end if;
    update public.stock_alerts set notified_at = now() where id = any(ids);
    perform public.send_order_alert(
      'Back in stock · ' || cardinality(ids) || ' waiting',
      p.name || ' size ' || new.size || ' is back. Message the customers who asked for it.',
      '/admin/stock-alerts');
  end if;
  return new;
exception when others then
  return new;
end;
$$;
revoke execute on function public.notify_back_in_stock() from public, anon, authenticated;
drop trigger if exists variants_back_in_stock on public.product_variants;
create trigger variants_back_in_stock after update of stock on public.product_variants
  for each row execute function public.notify_back_in_stock();

-- =====================================================================
-- Unpaid orders: reminder, then automatic cancellation (stock is restored by restock_on_cancel)
-- Hours count from the shop's first reply in the chat, so orders are never cancelled
-- before the customer has received payment details.
-- =====================================================================
create or replace function public.process_unpaid_orders()
returns int language plpgsql security definer set search_path = public as $$
declare
  v_rem int;
  v_cancel int;
  o record;
  n int := 0;
begin
  select reminder_hours, auto_cancel_hours into v_rem, v_cancel from public.admin_settings where id = 1;

  if v_rem is not null then
    for o in
      select ord.id, ord.order_number, ord.total
        from public.orders ord
       where ord.status = 'pending' and ord.payment_status = 'unpaid' and ord.reminder_sent_at is null
         and (select min(m.created_at) from public.order_messages m where m.order_id = ord.id and m.sender = 'admin')
             < now() - make_interval(hours => v_rem)
         and not exists (select 1 from public.order_messages m where m.order_id = ord.id and m.sender = 'customer' and m.attachment_path is not null)
    loop
      insert into public.order_messages (order_id, sender, body) values (o.id, 'system',
        'Friendly reminder: your order ' || o.order_number || ' (Rs. ' || to_char(o.total, 'FM999,999,999') ||
        ') is waiting for payment. Please pay using the details above and send the screenshot here.' ||
        case when v_cancel is not null then ' Unpaid orders are released after ' || v_cancel || ' hours.' else '' end ||
        ' Need help? Just reply.');
      update public.orders set reminder_sent_at = now() where id = o.id;
      n := n + 1;
    end loop;
  end if;

  if v_cancel is not null then
    perform set_config('qw.auto_cancel', '1', true);
    for o in
      select ord.id
        from public.orders ord
       where ord.status = 'pending' and ord.payment_status = 'unpaid'
         and (select min(m.created_at) from public.order_messages m where m.order_id = ord.id and m.sender = 'admin')
             < now() - make_interval(hours => v_cancel)
         and not exists (select 1 from public.order_messages m where m.order_id = ord.id and m.sender = 'customer' and m.attachment_path is not null)
    loop
      update public.orders set status = 'cancelled' where id = o.id;
      n := n + 1;
    end loop;
    perform set_config('qw.auto_cancel', '0', true);
  end if;
  return n;
end;
$$;
revoke execute on function public.process_unpaid_orders() from public, anon, authenticated;

-- =====================================================================
-- Analytics IDs (public: they appear in the page source anyway)
-- =====================================================================
alter table public.settings
  add column if not exists ga_measurement_id text check (ga_measurement_id is null or ga_measurement_id ~ '^G-[A-Z0-9]{4,20}$'),
  add column if not exists meta_pixel_id text check (meta_pixel_id is null or meta_pixel_id ~ '^[0-9]{6,20}$');

-- Run the unpaid-order automation every hour
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'qw-unpaid-orders';
select cron.schedule('qw-unpaid-orders', '17 * * * *', 'select public.process_unpaid_orders()');
