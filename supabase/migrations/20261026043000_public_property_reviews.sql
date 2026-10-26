create or replace view public.public_property_reviews
with (security_barrier = true, security_invoker = false)
as
select
  review.id,
  review.property_id,
  review.rating,
  review.comment,
  review.created_at
from public.reviews as review
join public.properties as property
  on property.id = review.property_id
where property.is_active is true;

grant select on table public.public_property_reviews to anon, authenticated;
