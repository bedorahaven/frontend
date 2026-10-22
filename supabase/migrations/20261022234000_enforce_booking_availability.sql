create or replace function public.get_property_booked_dates(
  p_property_id uuid
)
returns table(check_in date, check_out date)
language sql
stable
security definer
set search_path = ''
as $$
  select b.check_in, b.check_out
  from public.bookings b
  where b.property_id = p_property_id
    and b.status::text <> 'cancelled'
  order by b.check_in;
$$;

revoke all on function public.get_property_booked_dates(uuid)
  from public, anon, authenticated;
grant execute on function public.get_property_booked_dates(uuid)
  to anon, authenticated;

create or replace function public.is_property_available(
  p_property_id uuid,
  p_check_in date,
  p_check_out date
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_check_in is not null
    and p_check_out is not null
    and p_check_in < p_check_out
    and exists (
      select 1
      from public.properties p
      where p.id = p_property_id
        and p.is_active is true
    )
    and not exists (
      select 1
      from public.bookings b
      where b.property_id = p_property_id
        and b.status::text <> 'cancelled'
        and b.check_in < p_check_out
        and b.check_out > p_check_in
    );
$$;

revoke all on function public.is_property_available(uuid, date, date)
  from public, anon, authenticated;
grant execute on function public.is_property_available(uuid, date, date)
  to anon, authenticated;

create or replace function public.prevent_overlapping_property_bookings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status::text = 'cancelled' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.property_id::text, 0));

  if exists (
    select 1
    from public.bookings b
    where b.property_id = new.property_id
      and b.status::text <> 'cancelled'
      and b.check_in < new.check_out
      and b.check_out > new.check_in
      and b.id is distinct from new.id
  ) then
    raise exception using
      errcode = '23P01',
      message = 'Selected dates are already booked.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_overlapping_property_bookings
  on public.bookings;

create trigger prevent_overlapping_property_bookings
before insert or update of property_id, check_in, check_out, status
on public.bookings
for each row
execute function public.prevent_overlapping_property_bookings();
