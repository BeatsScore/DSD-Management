-- Ensure profiles table exists (stub for foreign key compatibility)
-- The real profiles table is created in schema.sql with auth.users reference
create table if not exists public.profiles (
  id uuid primary key
);

-- Manufacturers table
create table if not exists public.manufacturers (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamptz default now()
);

-- Product owners junction table (replaces single owner_id)
create table if not exists public.product_owners (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  owner_id uuid references public.profiles(id) not null,
  quantity integer not null default 1,
  created_at timestamptz default now(),
  unique(product_id, owner_id)
);

-- RLS
alter table public.manufacturers enable row level security;
alter table public.product_owners enable row level security;

create policy "Admin and staff full access on manufacturers"
  on public.manufacturers for all to authenticated
  using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());

create policy "Allow public read on manufacturers"
  on public.manufacturers for select to anon using (true);

create policy "Admin and staff full access on product_owners"
  on public.product_owners for all to authenticated
  using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());
