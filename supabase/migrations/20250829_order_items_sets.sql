-- Allow order items to reference either a product or a product set.

-- Make product_id nullable so a set-only line is possible.
alter table public.order_items
  alter column product_id drop not null;

-- Add optional reference to product_sets.
alter table public.order_items
  add column if not exists set_id uuid references public.product_sets(id) on delete set null;

-- Ensure every order item references at least one of the two.
alter table public.order_items
  drop constraint if exists order_items_product_or_set;

alter table public.order_items
  add constraint order_items_product_or_set
  check (product_id is not null or set_id is not null);

-- Index for fast look-ups.
create index if not exists idx_order_items_set_id on public.order_items(set_id);
