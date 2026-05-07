-- Migration: Add extended product fields
alter table public.products
  add column if not exists image_url text,
  add column if not exists technical_specs text,
  add column if not exists rental_price_per_day numeric(10,2),
  add column if not exists quantity integer not null default 1,
  add column if not exists manual_url text,
  add column if not exists purchase_date date,
  add column if not exists purchase_price numeric(10,2),
  add column if not exists weight numeric(10,2),
  add column if not exists condition text check (condition in ('neu', 'gut', 'gebraucht', 'defekt'));

-- Storage bucket for product images
insert into storage.buckets (id, name, public)
  values ('product-images', 'product-images', true)
  on conflict (id) do nothing;

-- Allow authenticated users to upload product images
create policy "Allow authenticated uploads" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images');

create policy "Allow authenticated updates" on storage.objects
  for update to authenticated using (bucket_id = 'product-images');

create policy "Allow public read" on storage.objects
  for select to anon using (bucket_id = 'product-images');

create policy "Allow authenticated delete" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images');
