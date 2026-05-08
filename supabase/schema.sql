-- DSD Management - Supabase Schema

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null default 'customer' check (role in ('admin', 'staff', 'customer')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Product categories
create table if not exists public.product_categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  parent_id uuid references public.product_categories(id) on delete set null,
  created_at timestamptz default now()
);

-- Products / Inventory
create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  product_id text not null unique,
  name text not null,
  manufacturer text,
  manufacture_date date,
  dimensions text,
  description text,
  category_id uuid references public.product_categories(id),
  status text not null default 'verfuegbar' check (status in ('verfuegbar', 'vermietet', 'reserviert', 'defekt')),
  barcode text not null unique,
  barcode_data_url text,
  image_url text,
  technical_specs text,
  rental_price_per_day numeric(10,2),
  quantity integer not null default 1,
  manual_url text,
  purchase_date date,
  purchase_price numeric(10,2),
  weight numeric(10,2),
  condition text check (condition in ('neu', 'gut', 'gebraucht', 'defekt')),
  owner_id uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Customers
create table if not exists public.customers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  company text,
  email text not null,
  phone text,
  address text,
  notes text,
  id_document_front_url text,
  id_document_back_url text,
  rating_payment integer check (rating_payment between 0 and 5),
  rating_behavior integer check (rating_behavior between 0 and 5),
  rating_equipment_care integer check (rating_equipment_care between 0 and 5),
  trust_status text check (trust_status in ('gruen', 'gelb', 'rot')) default 'gruen',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Orders
create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  order_number text not null unique,
  customer_id uuid references public.customers(id) not null,
  assigned_to uuid references public.profiles(id),
  status text not null default 'offen' check (status in ('offen', 'verhandlungsphase', 'vertragsphase', 'bestaetigt', 'abgeholt', 'zurueckgebracht', 'abgeschlossen', 'storniert')),
  start_date date not null,
  end_date date not null,
  total_amount numeric(10,2),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Order items
create table if not exists public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id uuid references public.products(id) not null,
  quantity integer not null default 1,
  price_per_day numeric(10,2),
  created_at timestamptz default now()
);

-- Requests (public inquiries)
create table if not exists public.requests (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  company text,
  email text not null,
  phone text,
  event_description text,
  start_date date,
  end_date date,
  product_ids uuid[],
  status text not null default 'offen' check (status in ('offen', 'bearbeitung', 'abgelehnt', 'angebot_erstellt')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Documents
create table if not exists public.documents (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  type text not null check (type in ('angebot', 'rechnung', 'mietvertrag', 'auftragsbestaetigung', 'ablehnung')),
  file_url text,
  file_name text not null,
  created_at timestamptz default now()
);

-- Inventory status logs
create table if not exists public.inventory_status_logs (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  old_status text not null,
  new_status text not null,
  changed_by uuid references public.profiles(id),
  reason text,
  created_at timestamptz default now()
);

-- Pickup sessions
create table if not exists public.pickup_sessions (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  started_at timestamptz default now(),
  completed_at timestamptz,
  scanned_items uuid[],
  started_by uuid references public.profiles(id) not null
);

-- Product Sets
create table if not exists public.product_sets (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  image_url text,
  rental_price_per_day numeric(10,2),
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Set items (products in a set)
create table if not exists public.set_items (
  id uuid default gen_random_uuid() primary key,
  set_id uuid references public.product_sets(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  quantity integer not null default 1,
  created_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.requests enable row level security;
alter table public.documents enable row level security;
alter table public.inventory_status_logs enable row level security;
alter table public.pickup_sessions enable row level security;
alter table public.product_sets enable row level security;
alter table public.set_items enable row level security;

create policy "Allow all access to authenticated" on public.profiles for all to authenticated using (true) with check (true);
create policy "Allow all access to authenticated" on public.product_categories for all to authenticated using (true) with check (true);
create policy "Allow all access to authenticated" on public.products for all to authenticated using (true) with check (true);
create policy "Allow all access to authenticated" on public.customers for all to authenticated using (true) with check (true);
create policy "Allow all access to authenticated" on public.orders for all to authenticated using (true) with check (true);
create policy "Allow all access to authenticated" on public.order_items for all to authenticated using (true) with check (true);
create policy "Allow all access to authenticated" on public.requests for all to authenticated using (true) with check (true);
create policy "Allow all access to authenticated" on public.documents for all to authenticated using (true) with check (true);
create policy "Allow all access to authenticated" on public.inventory_status_logs for all to authenticated using (true) with check (true);
create policy "Allow all access to authenticated" on public.pickup_sessions for all to authenticated using (true) with check (true);
create policy "Allow all access to authenticated" on public.product_sets for all to authenticated using (true) with check (true);
create policy "Allow all access to authenticated" on public.set_items for all to authenticated using (true) with check (true);

create policy "Allow public read on products" on public.products for select to anon using (true);
create policy "Allow public read on categories" on public.product_categories for select to anon using (true);
create policy "Allow public read on product_sets" on public.product_sets for select to anon using (true);
create policy "Allow public read on set_items" on public.set_items for select to anon using (true);
create policy "Allow public insert on requests" on public.requests for insert to anon with check (true);

-- Function to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'role', 'customer'));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
