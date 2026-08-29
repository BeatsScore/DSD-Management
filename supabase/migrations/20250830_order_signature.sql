-- Add customer signature fields to orders.

alter table public.orders
  add column if not exists customer_signature_url text,
  add column if not exists customer_signed_at timestamptz;
