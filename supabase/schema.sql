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
  image_urls text[],
  technical_specs text,
  rental_price_per_day numeric(10,2),
  quantity integer not null default 1,
  manual_url text,
  purchase_date date,
  purchase_price numeric(10,2),
  weight numeric(10,2),
  condition text check (condition in ('neu', 'gut', 'gebraucht', 'defekt')),
  owner_id uuid references public.profiles(id),
  active boolean not null default true,
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
  pickup_date date,
  pickup_time text,
  pickup_staff_id uuid references public.profiles(id) on delete set null,
  return_date date,
  return_time text,
  return_staff_id uuid references public.profiles(id) on delete set null,
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

-- Damage logs
create table if not exists public.damage_logs (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  product_ids uuid[],
  description text not null,
  photo_path text,
  severity text check (severity in ('leicht', 'mittel', 'schwer')) default 'leicht',
  created_at timestamptz default now()
);

-- Maintenance logs
create table if not exists public.maintenance_logs (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  maintenance_date date not null,
  description text not null,
  cost numeric(10,2),
  next_service_date date,
  performed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
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

-- Manufacturers
create table if not exists public.manufacturers (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamptz default now()
);

-- Product owners (many-to-many with quantity)
create table if not exists public.product_owners (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  owner_id uuid references public.profiles(id) not null,
  quantity integer not null default 1,
  created_at timestamptz default now(),
  unique(product_id, owner_id)
);

-- RLS helper function
create or replace function public.is_admin_or_staff()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'staff')
  );
end;
$$ language plpgsql security definer;

-- RLS enable
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
alter table public.damage_logs enable row level security;
alter table public.maintenance_logs enable row level security;
alter table public.manufacturers enable row level security;
alter table public.product_owners enable row level security;

-- Profiles: own profile read, admin/staff full access
create policy "Users can read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Admin and staff full access on profiles" on public.profiles for all to authenticated using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());

-- Internal tables: admin/staff only
create policy "Admin and staff full access on categories" on public.product_categories for all to authenticated using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());
create policy "Admin and staff full access on products" on public.products for all to authenticated using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());
create policy "Admin and staff full access on customers" on public.customers for all to authenticated using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());
create policy "Admin and staff full access on orders" on public.orders for all to authenticated using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());
create policy "Admin and staff full access on order_items" on public.order_items for all to authenticated using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());
create policy "Admin and staff full access on requests" on public.requests for all to authenticated using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());
create policy "Admin and staff full access on documents" on public.documents for all to authenticated using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());
create policy "Admin and staff full access on inventory_status_logs" on public.inventory_status_logs for all to authenticated using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());
create policy "Admin and staff full access on pickup_sessions" on public.pickup_sessions for all to authenticated using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());
create policy "Admin and staff full access on product_sets" on public.product_sets for all to authenticated using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());
create policy "Admin and staff full access on set_items" on public.set_items for all to authenticated using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());
create policy "Admin and staff full access on damage_logs" on public.damage_logs for all to authenticated using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());
create policy "Admin and staff full access on maintenance_logs" on public.maintenance_logs for all to authenticated using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());
create policy "Admin and staff full access on manufacturers" on public.manufacturers for all to authenticated using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());
create policy "Admin and staff full access on product_owners" on public.product_owners for all to authenticated using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());

-- Public catalog access (anon)
create policy "Allow public read on products" on public.products for select to anon using (true);
create policy "Allow public read on categories" on public.product_categories for select to anon using (true);
create policy "Allow public read on product_sets" on public.product_sets for select to anon using (true);
create policy "Allow public read on set_items" on public.set_items for select to anon using (true);
create policy "Allow public read on manufacturers" on public.manufacturers for select to anon using (true);

-- Public inquiry
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
