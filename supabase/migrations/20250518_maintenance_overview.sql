-- Maintenance overview support

-- Add maintenance interval to products (days until next service)
alter table public.products
  add column if not exists maintenance_interval integer default 365;

-- Add product category/type for filtering
-- (products already have category_id)
