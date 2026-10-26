create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as admin_profile
    where admin_profile.id = (select auth.uid())
      and admin_profile.role::text = 'admin'
  );
$$;

revoke all on function public.is_current_user_admin()
  from public, anon;
grant execute on function public.is_current_user_admin()
  to authenticated;

alter table public.profiles enable row level security;
grant select on table public.profiles to authenticated;

drop policy if exists "Admins can view all profiles"
  on public.profiles;

create policy "Admins can view all profiles"
  on public.profiles
  for select
  to authenticated
  using ((select public.is_current_user_admin()));
