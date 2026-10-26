alter table public.conversations
  alter column booking_id drop not null,
  alter column guest_id drop not null,
  add column if not exists guest_email text,
  add column if not exists guest_name text;

alter table public.messages
  alter column sender_id drop not null;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

revoke all on table public.conversations, public.messages
  from anon, authenticated;
grant select, insert, update, delete
  on table public.conversations, public.messages
  to service_role;
