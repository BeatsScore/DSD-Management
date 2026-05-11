-- Add active flag to products (for online/offline in catalog)
alter table public.products add column if not exists active boolean not null default true;
