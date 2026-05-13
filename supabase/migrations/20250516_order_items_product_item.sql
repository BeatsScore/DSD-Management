-- Add product_item_id to order_items for individual unit tracking
alter table public.order_items add column if not exists product_item_id uuid references public.product_items(id) on delete set null;

-- Index for fast lookups
create index if not exists idx_order_items_product_item_id on public.order_items(product_item_id);
