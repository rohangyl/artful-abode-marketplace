create type public.app_role as enum ('admin','user');
create type public.order_status as enum ('pending','paid','shipped','delivered','cancelled','failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text, address text, city text, state text, pincode text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null, unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'));
  insert into public.user_roles(user_id, role) values (new.id, 'user');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, name text not null, description text not null default '',
  category text not null default 'Decor', price_inr integer not null check (price_inr > 0),
  image_url text not null default '', stock integer not null default 0 check (stock >= 0),
  featured boolean not null default false, active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "public read active" on public.products for select to anon, authenticated using (active or public.has_role(auth.uid(),'admin'));
create policy "admin insert" on public.products for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin update" on public.products for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin delete" on public.products for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, status order_status not null default 'pending',
  total_inr integer not null, shipping_name text not null, shipping_phone text not null,
  shipping_address text not null, shipping_city text not null, shipping_state text not null, shipping_pincode text not null,
  razorpay_order_id text unique, razorpay_payment_id text,
  created_at timestamptz not null default now()
);
grant select on public.orders to authenticated;
grant update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "own orders read" on public.orders for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin update orders" on public.orders for update to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null, unit_price_inr integer not null, quantity integer not null check (quantity > 0)
);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "items read" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(),'admin'))));

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 255),
  message text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);
grant insert on public.contact_messages to anon, authenticated;
grant select, delete on public.contact_messages to authenticated;
grant all on public.contact_messages to service_role;
alter table public.contact_messages enable row level security;
create policy "anyone send" on public.contact_messages for insert to anon, authenticated with check (true);
create policy "admin read msgs" on public.contact_messages for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin delete msgs" on public.contact_messages for delete to authenticated using (public.has_role(auth.uid(),'admin'));

insert into public.products (slug,name,description,category,price_inr,image_url,stock,featured) values
('earth-forms-canvas','Earth Forms Canvas','Hand-painted abstract canvas in terracotta, ochre and sage, framed in natural oak. 60 × 80 cm.','Paintings',8499,'/images/p-painting.jpg',8,true),
('moradabad-brass-vase','Moradabad Brass Vase','Hand-engraved floral brass vase crafted by artisans in Moradabad. 30 cm tall.','Brass Decor',3299,'/images/p-brass.jpg',15,true),
('folk-dance-planter','Folk Dance Planter','Hand-painted terracotta planter with tribal folk motifs and matching saucer.','Ceramics',1499,'/images/p-planter.jpg',20,true),
('madhubani-peacock-print','Madhubani Peacock Print','Framed Madhubani folk art from Bihar featuring peacock and fish motifs. A3 size.','Folk Art',2799,'/images/p-madhubani.jpg',12,true),
('jute-weave-wall-hanging','Jute Weave Wall Hanging','Handwoven jute and cotton wall hanging in cream and terracotta tones. 50 × 90 cm.','Textiles',1999,'/images/p-hanging.jpg',10,false),
('jharokha-wooden-mirror','Jharokha Wooden Mirror','Hand-carved sheesham wood mirror inspired by Rajasthani jharokha arches. 45 × 75 cm.','Mirrors',6999,'/images/p-mirror.jpg',5,false);