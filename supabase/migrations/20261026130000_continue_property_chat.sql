alter table public.conversations
  add column if not exists guest_access_token uuid;

create unique index if not exists conversations_guest_access_token_idx
  on public.conversations(guest_access_token)
  where guest_access_token is not null;

drop function if exists public.create_property_inquiry(uuid, text, text, text);

create or replace function public.create_property_chat_message(
  p_property_id uuid,
  p_conversation_id uuid,
  p_guest_access_token uuid,
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
  target_conversation_id uuid;
  stored_guest_email text;
begin
  if p_property_id is null
    or p_guest_access_token is null
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
      message = 'Invalid property chat message.';
  end if;

  select profile.id
  into guest_profile_id
  from public.profiles as profile
  where profile.id = current_user_id;

  if p_conversation_id is null then
    select conversation.id, conversation.guest_email
    into target_conversation_id, stored_guest_email
    from public.conversations as conversation
    where conversation.guest_access_token = p_guest_access_token
      and conversation.property_id = p_property_id;

    if target_conversation_id is null then
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

      insert into public.conversations (
        property_id,
        booking_id,
        guest_id,
        host_id,
        guest_email,
        guest_name,
        guest_access_token
      )
      values (
        p_property_id,
        null,
        guest_profile_id,
        property_host_id,
        lower(trim(p_guest_email)),
        nullif(trim(coalesce(p_guest_name, '')), ''),
        p_guest_access_token
      )
      returning id into target_conversation_id;
    elsif stored_guest_email <> lower(trim(p_guest_email)) then
      raise exception using
        errcode = '42501',
        message = 'Chat access denied.';
    end if;
  else
    select conversation.id, conversation.guest_email
    into target_conversation_id, stored_guest_email
    from public.conversations as conversation
    where conversation.id = p_conversation_id
      and conversation.property_id = p_property_id
      and conversation.guest_access_token = p_guest_access_token;

    if target_conversation_id is null
      or stored_guest_email <> lower(trim(p_guest_email))
    then
      raise exception using
        errcode = '42501',
        message = 'Chat access denied.';
    end if;
  end if;

  update public.conversations
  set updated_at = timezone('utc'::text, now())
  where id = target_conversation_id;

  insert into public.messages (conversation_id, sender_id, content)
  values (
    target_conversation_id,
    guest_profile_id,
    trim(p_content)
  );

  return target_conversation_id;
end;
$$;

revoke all on function public.create_property_chat_message(
  uuid, uuid, uuid, text, text, text
) from public;
grant execute on function public.create_property_chat_message(
  uuid, uuid, uuid, text, text, text
) to anon, authenticated;
