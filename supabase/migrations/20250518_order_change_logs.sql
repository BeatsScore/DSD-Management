-- Order change log: tracks all modifications to an order

create table if not exists public.order_change_logs (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  change_type text not null check (change_type in ('datum', 'tagessaetze', 'produkte', 'mitarbeiter')),
  description text not null,
  old_value text,
  new_value text,
  created_at timestamptz default now()
);

-- RLS
alter table public.order_change_logs enable row level security;

-- Ensure is_admin_or_staff exists (safe fallback)
create or replace function public.is_admin_or_staff()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'staff')
  );
end;
$$ language plpgsql security definer;

drop policy if exists "Admin and staff full access on order_change_logs" on public.order_change_logs;
create policy "Admin and staff full access on order_change_logs" 
  on public.order_change_logs 
  for all to authenticated 
  using (public.is_admin_or_staff()) 
  with check (public.is_admin_or_staff());
