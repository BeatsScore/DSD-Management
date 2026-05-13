-- Product items: individual units per product with serial numbers and barcodes
create table if not exists public.product_items (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  serial_number text,
  barcode text not null unique,
  status text not null default 'verfuegbar' check (status in ('verfuegbar', 'vermietet', 'reserviert', 'defekt')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.product_items enable row level security;

create policy "Admin and staff full access on product_items"
  on public.product_items for all to authenticated
  using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());

create policy "Allow public read on product_items"
  on public.product_items for select to anon using (true);

-- Index for fast lookups
create index if not exists idx_product_items_product_id on public.product_items(product_id);
