-- Add owner to products
alter table public.products
  add column if not exists owner_id uuid references public.profiles(id);
