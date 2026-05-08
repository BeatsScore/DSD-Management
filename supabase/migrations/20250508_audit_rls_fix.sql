-- =============================================================================
-- AUDIT FIX: Secure RLS Policies
-- Run this in the Supabase SQL Editor
-- =============================================================================

-- 1. Drop old permissive policies (if they exist)
drop policy if exists "Allow all access to authenticated" on public.profiles;
drop policy if exists "Allow all access to authenticated" on public.product_categories;
drop policy if exists "Allow all access to authenticated" on public.products;
drop policy if exists "Allow all access to authenticated" on public.customers;
drop policy if exists "Allow all access to authenticated" on public.orders;
drop policy if exists "Allow all access to authenticated" on public.order_items;
drop policy if exists "Allow all access to authenticated" on public.requests;
drop policy if exists "Allow all access to authenticated" on public.documents;
drop policy if exists "Allow all access to authenticated" on public.inventory_status_logs;
drop policy if exists "Allow all access to authenticated" on public.pickup_sessions;
drop policy if exists "Allow all access to authenticated" on public.product_sets;
drop policy if exists "Allow all access to authenticated" on public.set_items;

-- Drop existing public policies so we can recreate them
drop policy if exists "Allow public read on products" on public.products;
drop policy if exists "Allow public read on categories" on public.product_categories;
drop policy if exists "Allow public read on product_sets" on public.product_sets;
drop policy if exists "Allow public read on set_items" on public.set_items;
drop policy if exists "Allow public insert on requests" on public.requests;

-- Drop existing admin policies so we can recreate them
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Admin and staff full access on profiles" on public.profiles;
drop policy if exists "Admin and staff full access on categories" on public.product_categories;
drop policy if exists "Admin and staff full access on products" on public.products;
drop policy if exists "Admin and staff full access on customers" on public.customers;
drop policy if exists "Admin and staff full access on orders" on public.orders;
drop policy if exists "Admin and staff full access on order_items" on public.order_items;
drop policy if exists "Admin and staff full access on requests" on public.requests;
drop policy if exists "Admin and staff full access on documents" on public.documents;
drop policy if exists "Admin and staff full access on inventory_status_logs" on public.inventory_status_logs;
drop policy if exists "Admin and staff full access on pickup_sessions" on public.pickup_sessions;
drop policy if exists "Admin and staff full access on product_sets" on public.product_sets;
drop policy if exists "Admin and staff full access on set_items" on public.set_items;

-- 2. Create helper function to check admin/staff role
create or replace function public.is_admin_or_staff()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'staff')
  );
end;
$$ language plpgsql security definer;

-- 3. Enable RLS on all tables (safe to re-run)
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

-- 4. Profiles: users can read own profile, admin/staff have full access
create policy "Users can read own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "Admin and staff full access on profiles"
  on public.profiles for all to authenticated
  using (public.is_admin_or_staff())
  with check (public.is_admin_or_staff());

-- 5. Internal tables: admin/staff only
create policy "Admin and staff full access on categories"
  on public.product_categories for all to authenticated
  using (public.is_admin_or_staff())
  with check (public.is_admin_or_staff());

create policy "Admin and staff full access on products"
  on public.products for all to authenticated
  using (public.is_admin_or_staff())
  with check (public.is_admin_or_staff());

create policy "Admin and staff full access on customers"
  on public.customers for all to authenticated
  using (public.is_admin_or_staff())
  with check (public.is_admin_or_staff());

create policy "Admin and staff full access on orders"
  on public.orders for all to authenticated
  using (public.is_admin_or_staff())
  with check (public.is_admin_or_staff());

create policy "Admin and staff full access on order_items"
  on public.order_items for all to authenticated
  using (public.is_admin_or_staff())
  with check (public.is_admin_or_staff());

create policy "Admin and staff full access on requests"
  on public.requests for all to authenticated
  using (public.is_admin_or_staff())
  with check (public.is_admin_or_staff());

create policy "Admin and staff full access on documents"
  on public.documents for all to authenticated
  using (public.is_admin_or_staff())
  with check (public.is_admin_or_staff());

create policy "Admin and staff full access on inventory_status_logs"
  on public.inventory_status_logs for all to authenticated
  using (public.is_admin_or_staff())
  with check (public.is_admin_or_staff());

create policy "Admin and staff full access on pickup_sessions"
  on public.pickup_sessions for all to authenticated
  using (public.is_admin_or_staff())
  with check (public.is_admin_or_staff());

create policy "Admin and staff full access on product_sets"
  on public.product_sets for all to authenticated
  using (public.is_admin_or_staff())
  with check (public.is_admin_or_staff());

create policy "Admin and staff full access on set_items"
  on public.set_items for all to authenticated
  using (public.is_admin_or_staff())
  with check (public.is_admin_or_staff());

-- 6. Public catalog access (anon can read products/categories/sets)
create policy "Allow public read on products"
  on public.products for select to anon using (true);

create policy "Allow public read on categories"
  on public.product_categories for select to anon using (true);

create policy "Allow public read on product_sets"
  on public.product_sets for select to anon using (true);

create policy "Allow public read on set_items"
  on public.set_items for select to anon using (true);

-- 7. Public inquiry (anon can submit requests)
create policy "Allow public insert on requests"
  on public.requests for insert to anon with check (true);
