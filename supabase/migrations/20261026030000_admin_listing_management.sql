alter table public.properties enable row level security;
alter table public.property_media enable row level security;

grant select, insert, update, delete on table public.properties
  to authenticated;
grant select, insert, update, delete on table public.property_media
  to authenticated;

drop policy if exists "Admins can manage all properties"
  on public.properties;

create policy "Admins can manage all properties"
  on public.properties
  for all
  to authenticated
  using ((select public.is_current_user_admin()))
  with check ((select public.is_current_user_admin()));

drop policy if exists "Admins can manage all property media"
  on public.property_media;

create policy "Admins can manage all property media"
  on public.property_media
  for all
  to authenticated
  using ((select public.is_current_user_admin()))
  with check ((select public.is_current_user_admin()));
