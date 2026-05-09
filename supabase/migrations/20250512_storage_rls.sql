-- Storage RLS policies for product-manuals bucket

-- Ensure bucket exists and is public
insert into storage.buckets (id, name, public)
values ('product-manuals', 'product-manuals', true)
on conflict (id) do update set public = true;

-- Allow authenticated users (admin/staff) to upload to product-manuals
-- Note: We allow all authenticated users since admin auth is handled at app level

-- SELECT policy
create policy "Allow authenticated read on product-manuals"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'product-manuals');

-- INSERT policy
create policy "Allow authenticated insert on product-manuals"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'product-manuals');

-- UPDATE policy
create policy "Allow authenticated update on product-manuals"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'product-manuals')
  with check (bucket_id = 'product-manuals');

-- DELETE policy
create policy "Allow authenticated delete on product-manuals"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'product-manuals');

-- Also ensure product-images bucket has proper policies (if missing)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;
