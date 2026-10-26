alter table public.bookings
  add column if not exists tax_fee numeric(10, 2) not null default 0,
  add column if not exists service_fee numeric(10, 2) not null default 0;

alter table public.bookings
  drop constraint if exists bookings_tax_fee_nonnegative,
  add constraint bookings_tax_fee_nonnegative check (tax_fee >= 0),
  drop constraint if exists bookings_service_fee_nonnegative,
  add constraint bookings_service_fee_nonnegative check (service_fee >= 0);

create or replace function public.reconcile_booking_fees(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking_row record;
  nightly_rate numeric;
  accommodation_total numeric;
  calculated_service_fee numeric;
  calculated_tax_fee numeric;
  calculated_total numeric;
begin
  select
    b.property_id,
    b.total_nights,
    b.guests_count,
    b.total_price,
    p.price_per_night
  into booking_row
  from public.bookings as b
  join public.properties as p on p.id = b.property_id
  where b.id = p_booking_id
  for update of b;

  if not found then
    raise exception 'Booking not found.';
  end if;

  if booking_row.total_nights < 1 or booking_row.guests_count < 1 then
    raise exception 'Booking pricing details are invalid.';
  end if;

  nightly_rate := round(
    booking_row.price_per_night *
    case
      when booking_row.guests_count > 2
        then 1 + (booking_row.guests_count - 2) * 0.05
      else 1
    end
  );
  accommodation_total := nightly_rate * booking_row.total_nights;
  calculated_service_fee := round(accommodation_total * 0.03);
  calculated_tax_fee := round((accommodation_total + calculated_service_fee) * 0.16);
  calculated_total :=
    accommodation_total + calculated_service_fee + calculated_tax_fee;

  if round(booking_row.total_price, 2) <> calculated_total then
    raise exception 'Booking total does not match the current fee calculation.';
  end if;

  update public.bookings
  set
    service_fee = calculated_service_fee,
    tax_fee = calculated_tax_fee
  where id = p_booking_id;
end;
$$;

revoke all on function public.reconcile_booking_fees(uuid)
  from public;
grant execute on function public.reconcile_booking_fees(uuid)
  to anon, authenticated, service_role;
