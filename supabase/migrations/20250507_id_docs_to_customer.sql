-- Move ID document columns from orders to customers
alter table public.orders drop column if exists id_document_front_url;
alter table public.orders drop column if exists id_document_back_url;

alter table public.customers
  add column if not exists id_document_front_url text,
  add column if not exists id_document_back_url text;
