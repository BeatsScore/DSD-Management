-- Track worked hours per order and staff member.

create table if not exists public.order_work_hours (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  staff_id uuid references public.profiles(id) on delete set null,
  work_date date not null,
  hours numeric(5,2) not null check (hours > 0),
  hourly_rate numeric(10,2),
  description text,
  created_at timestamptz default now()
);

alter table public.order_work_hours enable row level security;

create policy "Admin and staff full access on order_work_hours"
  on public.order_work_hours for all to authenticated
  using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());

create index if not exists idx_order_work_hours_order_id on public.order_work_hours(order_id);
create index if not exists idx_order_work_hours_staff_id on public.order_work_hours(staff_id);
