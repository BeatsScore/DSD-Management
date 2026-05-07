-- Add customer ratings and trust status
alter table public.customers
  add column if not exists rating_payment integer check (rating_payment between 0 and 5),
  add column if not exists rating_behavior integer check (rating_behavior between 0 and 5),
  add column if not exists rating_equipment_care integer check (rating_equipment_care between 0 and 5),
  add column if not exists trust_status text check (trust_status in ('gruen', 'gelb', 'rot')) default 'gruen';
