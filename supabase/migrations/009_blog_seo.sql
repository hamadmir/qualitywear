-- SEO fields for journal posts
alter table public.blog_posts
  add column if not exists tags text[] not null default '{}',
  add column if not exists meta_title text check (meta_title is null or char_length(meta_title) <= 120),
  add column if not exists meta_description text check (meta_description is null or char_length(meta_description) <= 320),
  add column if not exists cover_alt text;
create index if not exists blog_posts_tags_idx on public.blog_posts using gin (tags);
