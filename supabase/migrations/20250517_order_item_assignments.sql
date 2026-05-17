-- Order item assignments: track which concrete product_items are assigned to an order
-- during pickup/return scanning in the planner

create table if not exists public.order_item_assignments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_item_id uuid not null references public.product_items(id) on delete cascade,
  action_type text not null check (action_type in ('pickup', 'return')),
  created_at timestamp with time zone default now(),
  created_by uuid references public.profiles(id)
);

-- Ensure a product_item can only have one active pickup per order
-- (a product_item can't be picked up twice for the same order)
create unique index if not exists idx_order_item_assignments_unique_pickup
  on public.order_item_assignments(order_id, product_item_id, action_type);

-- Index for fast lookups by order
 create index if not exists idx_order_item_assignments_order_id
  on public.order_item_assignments(order_id);

-- Index for fast lookups by product_item
 create index if not exists idx_order_item_assignments_product_item_id
  on public.order_item_assignments(product_item_id);

-- RLS policies
alter table public.order_item_assignments enable row level security;

-- Admin and staff full access
begin;
  drop policy if exists "Admin and staff full access on order_item_assignments" on public.order_item_assignments;
  create policy "Admin and staff full access on order_item_assignments"
    on public.order_item_assignments for all to authenticated
    using (public.is_admin_or_staff())
    with check (public.is_admin_or_staff());
commit;

-- Allow public read (for potential customer portal)
begin;
  drop policy if exists "Allow public read on order_item_assignments" on public.order_item_assignments;
  create policy "Allow public read on order_item_assignments"
    on public.order_item_assignments for select to anon using (true);
commit;
