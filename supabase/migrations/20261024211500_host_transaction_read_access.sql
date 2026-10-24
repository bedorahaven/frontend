alter table public.transactions enable row level security;

grant select on table public.transactions to authenticated;

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
