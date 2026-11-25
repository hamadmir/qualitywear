-- Shop owner ka account bante hi khud admin ban jaye
create or replace function public.grant_owner_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) = 'hamadmir92@gmail.com' then
    insert into public.admins (user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.grant_owner_admin() from public, anon, authenticated;

drop trigger if exists on_auth_user_owner_admin on auth.users;
create trigger on_auth_user_owner_admin after insert on auth.users
  for each row execute function public.grant_owner_admin();

insert into public.admins (user_id)
select id from auth.users where lower(email) = 'hamadmir92@gmail.com'
on conflict do nothing;

alter function public.touch_updated_at() set search_path = public;
revoke execute on function public.restock_on_cancel() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

-- Shuru ki categories
insert into public.categories(name,slug,sort_order) values
('Shirts','shirts',0),('Kurta Shalwar','kurta-shalwar',1),('Jeans','jeans',2),('Polo','polo',3),('Jackets','jackets',4)
on conflict (slug) do nothing;
