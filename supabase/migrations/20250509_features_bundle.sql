-- Feature bundle: Payments, Damage Logs, Maintenance Logs

-- 1. Payment tracking on orders
alter table public.orders
  add column if not exists payment_status text check (payment_status in ('offen', 'anzahlung', 'vollstaendig')) default 'offen',
  add column if not exists payment_method text check (payment_method in ('bar', 'ueberweisung', 'karte', 'paypal')),
  add column if not exists paid_amount numeric(10,2) default 0;

-- 2. Damage logs
create table if not exists public.damage_logs (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete set null,
  description text not null,
  photo_path text,
  severity text check (severity in ('leicht', 'mittel', 'schwer')) default 'leicht',
  created_at timestamptz default now()
);

-- 3. Maintenance logs
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

-- RLS
alter table public.damage_logs enable row level security;
alter table public.maintenance_logs enable row level security;

-- Drop existing policies first to avoid conflicts
drop policy if exists "Admin and staff full access on damage_logs" on public.damage_logs;
drop policy if exists "Admin and staff full access on maintenance_logs" on public.maintenance_logs;

create policy "Admin and staff full access on damage_logs" on public.damage_logs for all to authenticated using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());
create policy "Admin and staff full access on maintenance_logs" on public.maintenance_logs for all to authenticated using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());
