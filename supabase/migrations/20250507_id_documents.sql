-- Migration: Add ID document fields to orders
alter table public.orders
  add column if not exists id_document_front_url text,
  add column if not exists id_document_back_url text;

-- Storage bucket for ID documents
insert into storage.buckets (id, name, public)
  values ('id-documents', 'id-documents', false)
  on conflict (id) do nothing;

-- Storage policies for id-documents (private, authenticated only)
create policy "Allow authenticated uploads on id-documents" on storage.objects
  for insert to authenticated with check (bucket_id = 'id-documents');

create policy "Allow authenticated read on id-documents" on storage.objects
  for select to authenticated using (bucket_id = 'id-documents');

create policy "Allow authenticated delete on id-documents" on storage.objects
  for delete to authenticated using (bucket_id = 'id-documents');
