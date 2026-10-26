create or replace function public.create_property_inquiry(
  p_property_id uuid,
  p_guest_email text,
  p_guest_name text,
  p_content text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  property_host_id uuid;
  guest_profile_id uuid;
  new_conversation_id uuid;
begin
  if p_property_id is null
    or p_guest_email is null
    or length(trim(p_guest_email)) > 254
    or trim(p_guest_email) !~* '^[A-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Z0-9-]+(\.[A-Z0-9-]+)+$'
    or length(coalesce(p_guest_name, '')) > 100
    or p_content is null
    or length(trim(p_content)) < 1
    or length(trim(p_content)) > 2000
  then
    raise exception using
      errcode = '22023',
      message = 'Invalid property inquiry details.';
  end if;

  select property.host_id
  into property_host_id
  from public.properties as property
  where property.id = p_property_id
    and property.is_active is true;

  if property_host_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Property is unavailable.';
  end if;

  select profile.id
  into guest_profile_id
  from public.profiles as profile
  where profile.id = current_user_id;

  insert into public.conversations (
    property_id,
    booking_id,
    guest_id,
    host_id,
    guest_email,
    guest_name
  )
  values (
    p_property_id,
    null,
    guest_profile_id,
    property_host_id,
    lower(trim(p_guest_email)),
    nullif(trim(coalesce(p_guest_name, '')), '')
  )
  returning id into new_conversation_id;

  insert into public.messages (conversation_id, sender_id, content)
  values (
    new_conversation_id,
    guest_profile_id,
    trim(p_content)
  );

  return new_conversation_id;
end;
$$;

revoke all on function public.create_property_inquiry(uuid, text, text, text)
  from public;
grant execute on function public.create_property_inquiry(uuid, text, text, text)
  to anon, authenticated;
