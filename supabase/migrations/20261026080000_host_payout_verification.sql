alter table public.payout_methods
  add column if not exists verification_status text not null default 'pending',
  add column if not exists verified_at timestamptz null;

alter table public.payout_methods
  drop constraint if exists payout_methods_verification_status_check,
  add constraint payout_methods_verification_status_check
    check (verification_status in ('pending', 'verified', 'failed'));

update public.payout_methods
set verification_status = 'pending',
    verified_at = null;

create or replace function public.prevent_host_payout_verification_changes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    new.verification_status := 'pending';
    new.verified_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists payout_methods_verification_guard
  on public.payout_methods;
create trigger payout_methods_verification_guard
before insert or update
on public.payout_methods
for each row
execute function public.prevent_host_payout_verification_changes();

create table if not exists public.payout_method_verification_codes (
  id uuid primary key default gen_random_uuid(),
  payout_method_id uuid not null
    references public.payout_methods(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  code_hash text not null,
  attempts integer not null default 0 check (attempts >= 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  used_at timestamptz null
);

create index if not exists payout_method_verification_codes_host_created_idx
  on public.payout_method_verification_codes(host_id, created_at desc);

create index if not exists payout_method_verification_codes_method_created_idx
  on public.payout_method_verification_codes(payout_method_id, created_at desc);

alter table public.payout_method_verification_codes enable row level security;
revoke all on table public.payout_method_verification_codes
  from public, anon, authenticated;
grant all on table public.payout_method_verification_codes to service_role;

create or replace function public.increment_payout_verification_attempt(
  verification_id uuid,
  verification_host_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_record_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required.';
  end if;

  update public.payout_method_verification_codes
  set attempts = attempts + 1
  where id = verification_id
    and host_id = verification_host_id
    and used_at is null
    and expires_at > now()
    and attempts < 5
  returning id into attempt_record_id;

  return attempt_record_id is not null;
end;
$$;

revoke all on function public.increment_payout_verification_attempt(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.increment_payout_verification_attempt(uuid, uuid)
  to service_role;

comment on column public.payout_methods.verification_status is
  'Payout destination verification state; only trusted server-side service actions may mark a method verified.';
