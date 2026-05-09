-- Damage logs: support multiple products per damage entry

-- 1. Add product_ids array column
alter table public.damage_logs
  add column if not exists product_ids uuid[];

-- 2. Migrate existing data: copy product_id into product_ids array
update public.damage_logs
  set product_ids = array[product_id]
  where product_id is not null and product_ids is null;

-- 3. Drop old single-product column
alter table public.damage_logs
  drop column if exists product_id;
