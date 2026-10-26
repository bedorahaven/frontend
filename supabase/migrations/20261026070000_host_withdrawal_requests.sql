create or replace function public.is_current_user_host()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as host_profile
    where host_profile.id = (select auth.uid())
      and host_profile.role::text = 'host'
  );
$$;

revoke all on function public.is_current_user_host()
  from public, anon;
grant execute on function public.is_current_user_host()
  to authenticated;

create table if not exists public.payout_methods (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  method_type text not null check (method_type in ('bank', 'mpesa')),
  bank_name text null,
  bank_code text null,
  account_name text null,
  account_number text null,
  phone_number text null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint payout_methods_details_check check (
    (
      method_type = 'bank'
      and nullif(trim(bank_name), '') is not null
      and nullif(trim(bank_code), '') is not null
      and nullif(trim(account_name), '') is not null
      and nullif(trim(account_number), '') is not null
      and phone_number is null
    )
    or
    (
      method_type = 'mpesa'
      and phone_number ~ '^254(7|1)[0-9]{8}$'
      and bank_name is null
      and bank_code is null
      and account_name is null
      and account_number is null
    )
  )
);

create index if not exists payout_methods_host_id_idx
  on public.payout_methods(host_id);

alter table public.payout_methods enable row level security;
grant select, insert, update, delete on table public.payout_methods to authenticated;

drop policy if exists "Hosts can manage their payout methods"
  on public.payout_methods;
create policy "Hosts can manage their payout methods"
  on public.payout_methods
  for all
  to authenticated
  using (
    host_id = (select auth.uid())
    and (select public.is_current_user_host())
  )
  with check (
    host_id = (select auth.uid())
    and (select public.is_current_user_host())
  );

drop policy if exists "Admins can view payout methods"
  on public.payout_methods;
create policy "Admins can view payout methods"
  on public.payout_methods
  for select
  to authenticated
  using ((select public.is_current_user_admin()));

alter table public.transactions
  alter column booking_id drop not null,
  alter column phone_number drop not null;

alter table public.transactions
  add column if not exists transaction_type text not null default 'payment',
  add column if not exists payout_method_id uuid null
    references public.payout_methods(id) on delete set null,
  add column if not exists payout_method_type text null,
  add column if not exists payout_bank_name text null,
  add column if not exists payout_bank_code text null,
  add column if not exists payout_account_name text null,
  add column if not exists payout_account_number text null,
  add column if not exists payout_phone_number text null;

alter table public.transactions
  drop constraint if exists transactions_transaction_type_check,
  add constraint transactions_transaction_type_check
    check (transaction_type in ('payment', 'withdrawal')),
  drop constraint if exists transactions_withdrawal_details_check,
  add constraint transactions_withdrawal_details_check
    check (
      (
        transaction_type = 'payment'
        and booking_id is not null
        and payout_method_id is null
        and payout_method_type is null
        and payout_bank_name is null
        and payout_bank_code is null
        and payout_account_name is null
        and payout_account_number is null
        and payout_phone_number is null
      )
      or
      (
        transaction_type = 'withdrawal'
        and booking_id is null
        and amount > 0
        and payout_method_type is not null
        and payout_method_type = 'bank'
        and nullif(trim(payout_bank_name), '') is not null
        and nullif(trim(payout_bank_code), '') is not null
        and nullif(trim(payout_account_name), '') is not null
        and nullif(trim(payout_account_number), '') is not null
        and payout_phone_number is null
        and phone_number is null
      )
      or
      (
        transaction_type = 'withdrawal'
        and booking_id is null
        and amount > 0
        and payout_method_type is not null
        and payout_method_type = 'mpesa'
        and payout_phone_number is not null
        and payout_phone_number ~ '^254(7|1)[0-9]{8}$'
        and payout_bank_name is null
        and payout_bank_code is null
        and payout_account_name is null
        and payout_account_number is null
        and phone_number is null
      )
    );

create index if not exists transactions_withdrawals_host_created_idx
  on public.transactions(profile_id, created_at desc)
  where transaction_type = 'withdrawal';

grant insert on table public.transactions to authenticated;
grant update (status, updated_at) on table public.transactions to authenticated;

drop policy if exists "Users can read their own transactions"
  on public.transactions;
create policy "Users can read their own transactions"
  on public.transactions
  for select
  to authenticated
  using (profile_id = (select auth.uid()));

drop policy if exists "Hosts can request withdrawals"
  on public.transactions;
create policy "Hosts can request withdrawals"
  on public.transactions
  for insert
  to authenticated
  with check (
    transaction_type = 'withdrawal'
    and booking_id is null
    and profile_id = (select auth.uid())
    and status::text = 'pending'
    and exists (
      select 1
      from public.payout_methods as payout_method
      where payout_method.id = transactions.payout_method_id
        and payout_method.host_id = (select auth.uid())
        and payout_method.method_type = transactions.payout_method_type
        and (
          (
            payout_method.method_type = 'bank'
            and payout_method.bank_name = transactions.payout_bank_name
            and payout_method.bank_code = transactions.payout_bank_code
            and payout_method.account_name = transactions.payout_account_name
            and payout_method.account_number = transactions.payout_account_number
          )
          or
          (
            payout_method.method_type = 'mpesa'
            and payout_method.phone_number = transactions.payout_phone_number
          )
        )
    )
  );

drop policy if exists "Limit authenticated transaction inserts to own withdrawals"
  on public.transactions;
create policy "Limit authenticated transaction inserts to own withdrawals"
  on public.transactions
  as restrictive
  for insert
  to authenticated
  with check (
    (select public.is_current_user_host())
    and transaction_type = 'withdrawal'
    and booking_id is null
    and profile_id = (select auth.uid())
    and status::text = 'pending'
    and exists (
      select 1
      from public.payout_methods as payout_method
      where payout_method.id = transactions.payout_method_id
        and payout_method.host_id = (select auth.uid())
        and payout_method.method_type = transactions.payout_method_type
        and (
          (
            payout_method.method_type = 'bank'
            and payout_method.bank_name = transactions.payout_bank_name
            and payout_method.bank_code = transactions.payout_bank_code
            and payout_method.account_name = transactions.payout_account_name
            and payout_method.account_number = transactions.payout_account_number
          )
          or
          (
            payout_method.method_type = 'mpesa'
            and payout_method.phone_number = transactions.payout_phone_number
          )
        )
    )
  );

drop policy if exists "Admins can update withdrawal requests"
  on public.transactions;
create policy "Admins can update withdrawal requests"
  on public.transactions
  for update
  to authenticated
  using (
    transaction_type = 'withdrawal'
    and (select public.is_current_user_admin())
  )
  with check (
    transaction_type = 'withdrawal'
    and (select public.is_current_user_admin())
  );

drop policy if exists "Limit withdrawal request updates to admins"
  on public.transactions;
create policy "Limit withdrawal request updates to admins"
  on public.transactions
  as restrictive
  for update
  to authenticated
  using (
    transaction_type = 'withdrawal'
    and (select public.is_current_user_admin())
  )
  with check (
    transaction_type = 'withdrawal'
    and (select public.is_current_user_admin())
  );
