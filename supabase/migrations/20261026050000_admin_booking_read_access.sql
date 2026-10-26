alter table public.bookings enable row level security;

grant select on table public.bookings to authenticated;

drop policy if exists "Admins can view all bookings"
  on public.bookings;

create policy "Admins can view all bookings"
  on public.bookings
  for select
  to authenticated
  using ((select public.is_current_user_admin()));

drop policy if exists "Hosts can view bookings for their properties"
  on public.bookings;

create policy "Hosts can view bookings for their properties"
  on public.bookings
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.properties as property
      where property.id = bookings.property_id
        and property.host_id = (select auth.uid())
    )
  );

drop policy if exists "Limit authenticated booking reads to admins and property hosts"
  on public.bookings;

create policy "Limit authenticated booking reads to admins and property hosts"
  on public.bookings
  as restrictive
  for select
  to authenticated
  using (
    (select public.is_current_user_admin())
    or bookings.guest_id = (select auth.uid())
    or exists (
      select 1
      from public.properties as property
      where property.id = bookings.property_id
        and property.host_id = (select auth.uid())
    )
  );
