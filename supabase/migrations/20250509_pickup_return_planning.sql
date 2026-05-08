-- Add pickup and return planning fields to orders

alter table public.orders
  add column if not exists pickup_date date,
  add column if not exists pickup_time text,
  add column if not exists pickup_staff_id uuid references public.profiles(id) on delete set null,
  add column if not exists return_date date,
  add column if not exists return_time text,
  add column if not exists return_staff_id uuid references public.profiles(id) on delete set null;
