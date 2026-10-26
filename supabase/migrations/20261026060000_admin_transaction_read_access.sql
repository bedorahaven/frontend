alter table public.transactions enable row level security;

grant select on table public.transactions to authenticated;

drop policy if exists "Admins can read all transactions"
  on public.transactions;

create policy "Admins can read all transactions"
  on public.transactions
  for select
  to authenticated
  using ((select public.is_current_user_admin()));

drop policy if exists "Hosts can read transactions for their bookings"
  on public.transactions;

create policy "Hosts can read transactions for their bookings"
  on public.transactions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookings as booking
      join public.properties as property
        on property.id = booking.property_id
      where booking.id = transactions.booking_id
        and property.host_id = (select auth.uid())
    )
  );

drop policy if exists "Limit authenticated transaction reads to admins, hosts, and owners"
  on public.transactions;

create policy "Limit authenticated transaction reads to admins, hosts, and owners"
  on public.transactions
  as restrictive
  for select
  to authenticated
  using (
    (select public.is_current_user_admin())
    or transactions.profile_id = (select auth.uid())
    or exists (
      select 1
      from public.bookings as booking
      join public.properties as property
        on property.id = booking.property_id
      where booking.id = transactions.booking_id
        and property.host_id = (select auth.uid())
    )
  );
