-- Damage logs: support product_item_ids for concrete physical items

-- 1. Add product_item_ids array column
alter table public.damage_logs
  add column if not exists product_item_ids uuid[];

-- 2. (Optional) Migrate existing data: map product_ids to representative product_item_ids
-- This is a best-effort migration: for each product_id in damage_logs, find one product_item
-- that belongs to the same order and product. If none found, leave null.
do $$
declare
  r record;
  new_item_ids uuid[];
  item_id uuid;
begin
  for r in select id, order_id, product_ids from public.damage_logs where product_item_ids is null and product_ids is not null loop
    new_item_ids := array[]::uuid[];
    foreach item_id in array r.product_ids loop
      -- Try to find a product_item for this product in the same order
      select pi.id into item_id
      from public.order_items oi
      join public.product_items pi on pi.product_id = oi.product_id
      where oi.order_id = r.order_id and oi.product_id = item_id
      limit 1;
      if item_id is not null then
        new_item_ids := array_append(new_item_ids, item_id);
      end if;
    end loop;
    if array_length(new_item_ids, 1) > 0 then
      update public.damage_logs set product_item_ids = new_item_ids where id = r.id;
    end if;
  end loop;
end $$;
