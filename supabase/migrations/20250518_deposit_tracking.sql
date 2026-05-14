-- Deposit tracking on orders
alter table public.orders
  add column if not exists deposit_status text check (deposit_status in ('offen', 'erhalten', 'zurueckerstattet')) default 'offen',
  add column if not exists deposit_amount numeric(10,2) default 0,
  add column if not exists deposit_paid_amount numeric(10,2) default 0,
  add column if not exists deposit_method text check (deposit_method in ('bar', 'ueberweisung', 'karte', 'paypal'));

-- RLS: orders table already has RLS enabled, just ensure columns are accessible
-- The existing policies on orders cover these new columns
