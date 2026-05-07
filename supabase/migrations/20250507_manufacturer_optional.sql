-- Make manufacturer optional
alter table public.products alter column manufacturer drop not null;
