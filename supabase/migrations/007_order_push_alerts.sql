-- New-order push notifications.
-- NOTE: the VAPID keys and the shared secret live in Supabase Vault
-- (qw_vapid_public, qw_vapid_private, qw_alert_secret). They are NOT stored in this repo.
-- The edge function "order-alert" (verify_jwt = false) sends the web pushes.
create extension if not exists pg_net;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "push subs admin all" on public.push_subscriptions
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.get_push_config()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'public',  (select decrypted_secret from vault.decrypted_secrets where name = 'qw_vapid_public'),
    'private', (select decrypted_secret from vault.decrypted_secrets where name = 'qw_vapid_private'),
    'secret',  (select decrypted_secret from vault.decrypted_secrets where name = 'qw_alert_secret'));
$$;
revoke all on function public.get_push_config() from public, anon, authenticated;
grant execute on function public.get_push_config() to service_role;

create or replace function public.send_order_alert(p_title text, p_body text, p_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://jgehgvehlgpwtkkstuea.supabase.co/functions/v1/order-alert',
    body := jsonb_build_object('title', p_title, 'body', p_body, 'url', p_url),
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-qw-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'qw_alert_secret')),
    timeout_milliseconds := 10000);
end;
$$;
revoke all on function public.send_order_alert(text, text, text) from public, anon, authenticated;

create or replace function public.notify_new_order()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.total = 0 and new.total > 0 and new.status = 'pending' then
    perform public.send_order_alert('New order ' || new.order_number,
      new.customer_name || ' · ' || new.city || ' · Rs. ' || to_char(new.total, 'FM999,999,999'),
      '/admin/orders/' || new.id);
  end if;
  return new;
exception when others then
  return new; -- never block an order because of a notification problem
end;
$$;
revoke execute on function public.notify_new_order() from public, anon, authenticated;
create trigger orders_notify_new after update of total on public.orders
  for each row execute function public.notify_new_order();

create or replace function public.send_test_alert()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  perform public.send_order_alert('Test notification', 'Order alerts are working on this device.', '/admin');
end;
$$;
revoke all on function public.send_test_alert() from public, anon;
grant execute on function public.send_test_alert() to authenticated;
