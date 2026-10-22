create or replace function public.is_host_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role::text = 'host'
  );
$$;

revoke all on function public.is_host_user() from public;
grant execute on function public.is_host_user() to authenticated;

grant select on table public.properties to anon, authenticated;
grant insert, update, delete on table public.properties to authenticated;
grant select on table public.property_media to anon, authenticated;
grant insert, update, delete on table public.property_media to authenticated;

alter table public.properties enable row level security;
alter table public.property_media enable row level security;

drop policy if exists "Enable read access for property media"
  on public.property_media;
drop policy if exists "Enable insert for property owners"
  on public.property_media;
drop policy if exists "Enable update for property owners"
  on public.property_media;
drop policy if exists "Enable delete for property owners"
  on public.property_media;

drop policy if exists "Public can read active properties"
  on public.properties;
drop policy if exists "Hosts can read their properties"
  on public.properties;
drop policy if exists "Hosts can create their properties"
  on public.properties;
drop policy if exists "Hosts can update their properties"
  on public.properties;
drop policy if exists "Hosts can delete their properties"
  on public.properties;

drop policy if exists "Public can read active property media"
  on public.property_media;
drop policy if exists "Hosts can read their property media"
  on public.property_media;
drop policy if exists "Hosts can insert their property media"
  on public.property_media;
drop policy if exists "Hosts can update their property media"
  on public.property_media;
drop policy if exists "Hosts can delete their property media"
  on public.property_media;

create policy "Public can read active properties"
on public.properties
for select
to anon, authenticated
using (is_active is true);

create policy "Hosts can read their properties"
on public.properties
for select
to authenticated
using (
  host_id = (select auth.uid())
  and (select public.is_host_user())
);

create policy "Hosts can create their properties"
on public.properties
for insert
to authenticated
with check (
  host_id = (select auth.uid())
  and (select public.is_host_user())
);

create policy "Hosts can update their properties"
on public.properties
for update
to authenticated
using (
  host_id = (select auth.uid())
  and (select public.is_host_user())
)
with check (
  host_id = (select auth.uid())
  and (select public.is_host_user())
);

create policy "Hosts can delete their properties"
on public.properties
for delete
to authenticated
using (
  host_id = (select auth.uid())
  and (select public.is_host_user())
);

create policy "Public can read active property media"
on public.property_media
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.properties
    where properties.id = property_media.property_id
      and properties.is_active is true
  )
);

create policy "Hosts can read their property media"
on public.property_media
for select
to authenticated
using (
  exists (
    select 1
    from public.properties
    where properties.id = property_media.property_id
      and properties.host_id = (select auth.uid())
  )
  and (select public.is_host_user())
);

create policy "Hosts can insert their property media"
on public.property_media
for insert
to authenticated
with check (
  exists (
    select 1
    from public.properties
    where properties.id = property_media.property_id
      and properties.host_id = (select auth.uid())
  )
  and (select public.is_host_user())
);

create policy "Hosts can update their property media"
on public.property_media
for update
to authenticated
using (
  exists (
    select 1
    from public.properties
    where properties.id = property_media.property_id
      and properties.host_id = (select auth.uid())
  )
  and (select public.is_host_user())
)
with check (
  exists (
    select 1
    from public.properties
    where properties.id = property_media.property_id
      and properties.host_id = (select auth.uid())
  )
  and (select public.is_host_user())
);

create policy "Hosts can delete their property media"
on public.property_media
for delete
to authenticated
using (
  exists (
    select 1
    from public.properties
    where properties.id = property_media.property_id
      and properties.host_id = (select auth.uid())
  )
  and (select public.is_host_user())
);
