-- Order discount support

-- 1. Add discount columns to orders
alter table public.orders
  add column if not exists discount_type text check (discount_type in ('prozentual', 'absolut'));

alter table public.orders
  add column if not exists discount_amount numeric(10,2) default 0;

alter table public.orders
  add column if not exists discount_reason text;

-- 2. Ensure discount_amount is non-negative
alter table public.orders
  add constraint orders_discount_amount_non_negative check (discount_amount >= 0);
