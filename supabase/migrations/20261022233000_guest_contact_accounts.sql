alter table public.profiles
  alter column email drop not null;

create or replace function public.claim_guest_bookings()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  verified_email text := lower(nullif((select auth.jwt()) ->> 'email', ''));
  phone_digits text := regexp_replace(
    coalesce((select auth.jwt()) ->> 'phone', ''),
    '\D',
    '',
    'g'
  );
  claimed_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication is required to claim guest bookings.';
  end if;

  if left(phone_digits, 1) = '0' then
    phone_digits := '254' || substring(phone_digits from 2);
  elsif phone_digits <> '' and left(phone_digits, 3) <> '254' then
    phone_digits := '254' || phone_digits;
  end if;

  update public.bookings b
  set guest_id = current_user_id
  where b.guest_id is null
    and (
      (
        verified_email is not null
        and lower(coalesce(b.guest_email, '')) = verified_email
      )
      or (
        phone_digits <> ''
        and case
          when left(regexp_replace(coalesce(b.phone_number, ''), '\D', '', 'g'), 1) = '0'
            then '254' || substring(regexp_replace(coalesce(b.phone_number, ''), '\D', '', 'g') from 2)
          when regexp_replace(coalesce(b.phone_number, ''), '\D', '', 'g') <> ''
            and left(regexp_replace(coalesce(b.phone_number, ''), '\D', '', 'g'), 3) <> '254'
            then '254' || regexp_replace(coalesce(b.phone_number, ''), '\D', '', 'g')
          else regexp_replace(coalesce(b.phone_number, ''), '\D', '', 'g')
        end = phone_digits
      )
    );

  get diagnostics claimed_count = row_count;
  return claimed_count;
end;
$$;

revoke all on function public.claim_guest_bookings()
  from public, anon;
grant execute on function public.claim_guest_bookings()
  to authenticated;
