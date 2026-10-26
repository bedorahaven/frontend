alter table public.reviews enable row level security;

grant select on table public.reviews to authenticated;

drop policy if exists "Admins can view all reviews"
  on public.reviews;

create policy "Admins can view all reviews"
  on public.reviews
  for select
  to authenticated
  using ((select public.is_current_user_admin()));

drop policy if exists "Hosts can view reviews for their properties"
  on public.reviews;

create policy "Hosts can view reviews for their properties"
  on public.reviews
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.properties as property
      where property.id = reviews.property_id
        and property.host_id = (select auth.uid())
    )
  );

drop policy if exists "Limit authenticated review reads to admins and property hosts"
  on public.reviews;

create policy "Limit authenticated review reads to admins and property hosts"
  on public.reviews
  as restrictive
  for select
  to authenticated
  using (
    (select public.is_current_user_admin())
    or exists (
      select 1
      from public.properties as property
      where property.id = reviews.property_id
        and property.host_id = (select auth.uid())
    )
  );
