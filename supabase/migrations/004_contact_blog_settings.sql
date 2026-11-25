-- Shop contact / about info
alter table public.settings
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists address text,
  add column if not exists map_link text,
  add column if not exists opening_hours text,
  add column if not exists instagram_url text,
  add column if not exists facebook_url text,
  add column if not exists tiktok_url text,
  add column if not exists about_text text;

create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 100),
  phone       text check (phone is null or char_length(phone) <= 30),
  email       text check (email is null or char_length(email) <= 150),
  subject     text check (subject is null or char_length(subject) <= 150),
  message     text not null check (char_length(message) between 1 and 3000),
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists contact_messages_created_idx on public.contact_messages(created_at desc);
alter table public.contact_messages enable row level security;
drop policy if exists "contact anyone insert" on public.contact_messages;
create policy "contact anyone insert" on public.contact_messages
  for insert to anon, authenticated with check (is_read = false);
drop policy if exists "contact admin all" on public.contact_messages;
create policy "contact admin all" on public.contact_messages
  for all using (public.is_admin()) with check (public.is_admin());
grant insert on public.contact_messages to anon, authenticated;

create table if not exists public.blog_posts (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  slug          text not null unique,
  excerpt       text,
  content       text not null default '',
  cover_url     text,
  is_published  boolean not null default false,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists blog_posts_pub_idx on public.blog_posts(is_published, published_at desc);
alter table public.blog_posts enable row level security;
drop policy if exists "blog public read" on public.blog_posts;
create policy "blog public read" on public.blog_posts
  for select using (is_published or public.is_admin());
drop policy if exists "blog admin all" on public.blog_posts;
create policy "blog admin all" on public.blog_posts
  for all using (public.is_admin()) with check (public.is_admin());
drop trigger if exists blog_touch on public.blog_posts;
create trigger blog_touch before update on public.blog_posts
  for each row execute function public.touch_updated_at();

delete from public.categories where slug = 'kurta-shalwar'
  and not exists (select 1 from public.products p join public.categories c on c.id = p.category_id where c.slug = 'kurta-shalwar');
update public.categories set sort_order = 1 where slug = 'jeans';
update public.categories set sort_order = 2 where slug = 'polo';
update public.categories set sort_order = 3 where slug = 'jackets';
