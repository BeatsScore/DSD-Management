-- Fix: Add status column which the application expects but was never created via migrations
alter table public.products add column if not exists status text not null default 'verfuegbar';

-- Add CHECK constraint for status (with 'inaktiv' for catalog visibility)
alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check check (status in ('verfuegbar', 'vermietet', 'reserviert', 'defekt', 'inaktiv'));
