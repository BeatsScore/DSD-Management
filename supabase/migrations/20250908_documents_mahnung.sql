-- Allow storing dunning reminders (Mahnungen) as order documents.

alter table public.documents
  drop constraint if exists documents_type_check;

alter table public.documents
  add constraint documents_type_check
  check (type in ('angebot', 'rechnung', 'mietvertrag', 'auftragsbestaetigung', 'ablehnung', 'mahnung'));
