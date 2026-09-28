-- Allow one-off custom positions on orders (no inventory link).

alter table public.order_items
  add column if not exists custom_name text;

alter table public.order_items
  add column if not exists custom_manufacturer text;

-- Every order item must reference a product, a set, or be a custom position.
alter table public.order_items
  drop constraint if exists order_items_product_or_set;

alter table public.order_items
  add constraint order_items_product_or_set
  check (product_id is not null or set_id is not null or custom_name is not null);
