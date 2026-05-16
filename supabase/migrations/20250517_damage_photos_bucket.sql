-- Create the damage-photos storage bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('damage-photos', 'damage-photos', true)
on conflict (id) do nothing;

-- Policy: Allow authenticated users to upload files
begin;
  drop policy if exists "damage-photos: authenticated upload" on storage.objects;
  create policy "damage-photos: authenticated upload"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'damage-photos');
commit;

-- Policy: Allow authenticated users to read files
begin;
  drop policy if exists "damage-photos: authenticated read" on storage.objects;
  create policy "damage-photos: authenticated read"
    on storage.objects for select
    to authenticated
    using (bucket_id = 'damage-photos');
commit;

-- Policy: Allow authenticated users to delete files
begin;
  drop policy if exists "damage-photos: authenticated delete" on storage.objects;
  create policy "damage-photos: authenticated delete"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'damage-photos');
commit;
