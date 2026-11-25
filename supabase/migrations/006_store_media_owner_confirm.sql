-- store_media table + bucket, English checkout errors, WhatsApp number: applied via migration "store_media_english_whatsapp"
-- Owner account auto-confirm
create or replace function public.owner_auto_confirm()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) = 'hamadmir92@gmail.com' and new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;
revoke all on function public.owner_auto_confirm() from public, anon, authenticated;
drop trigger if exists on_auth_user_owner_confirm on auth.users;
create trigger on_auth_user_owner_confirm before insert on auth.users
  for each row execute function public.owner_auto_confirm();
