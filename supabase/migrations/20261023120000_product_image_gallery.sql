alter table public.products
  add column image_urls text[] not null default '{}';
