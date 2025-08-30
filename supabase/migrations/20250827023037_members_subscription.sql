-- =====================================================
-- Seneca Protocol: Add subscription management to members table
-- =====================================================
-- Purpose: Gate dashboard access based on subscription status
-- Table: public.members (existing user profile table)
-- Author: Senior Dev Team
-- Date: 2025-08-27
-- =====================================================

-- Step 1: Add subscription and Stripe columns to members table
alter table public.members
  add column if not exists active_subscription boolean not null default false,
  add column if not exists subscription_tier text not null default 'free' 
    check (subscription_tier in ('free', 'basic', 'premium')),
  add column if not exists subscription_expires_at timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists avatar_url text;

-- Step 2: Enable and FORCE Row Level Security
-- Force ensures even table owner respects RLS
alter table public.members enable row level security;
alter table public.members force row level security;

-- Step 3: Create performance indexes
create index if not exists idx_members_active_subscription
  on public.members(active_subscription)
  where active_subscription = true; -- Partial index for active subs only

create index if not exists idx_members_stripe_customer
  on public.members(stripe_customer_id) 
  where stripe_customer_id is not null;

-- Step 4: Ensure updated_at trigger exists
-- Using consistent naming with other tables in the project
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

drop trigger if exists members_touch_updated_at on public.members;
create trigger members_touch_updated_at
  before update on public.members
  for each row 
  execute function public.touch_updated_at();

-- Step 5: RLS Policies (idempotent creation)
-- Policy 1: Users can SELECT their own row
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' 
      and tablename='members' 
      and policyname='members_select_own'
  ) then
    create policy members_select_own
      on public.members
      for select
      using (auth.uid() = id);
  end if;
end$$;

-- Policy 2: Users can UPDATE their own row
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' 
      and tablename='members' 
      and policyname='members_update_own'
  ) then
    create policy members_update_own
      on public.members
      for update
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end$$;

-- Step 6: Grant appropriate privileges
-- First, ensure clean slate (revoke any broad UPDATE if exists)
do $$
begin
  -- Revoke any existing broad UPDATE grant
  revoke update on public.members from authenticated;
exception
  when undefined_table then null;
  when undefined_object then null;
end$$;

-- Now grant specific privileges
grant usage on schema public to authenticated;
grant select on public.members to authenticated;
-- Column-specific UPDATE (users cannot modify subscription fields)
grant update (full_name, avatar_url) on public.members to authenticated;

-- Step 7: Auto-create member rows for new signups
-- Using namespaced function/trigger to avoid conflicts
create or replace function public.handle_new_user_members()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Create member profile for new auth user
  insert into public.members (
    id, 
    email, 
    full_name,
    active_subscription,
    subscription_tier
  )
  values (
    new.id, 
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'display_name', 
      split_part(new.email, '@', 1)
    ),
    false,  -- New users start without subscription
    'free'  -- Default tier
  )
  on conflict (id) do nothing; -- Idempotent
  
  return new;
end$$;

-- Namespaced trigger name to avoid conflicts
drop trigger if exists on_auth_user_created__members on auth.users;
create trigger on_auth_user_created__members
  after insert on auth.users
  for each row 
  execute function public.handle_new_user_members();

-- Step 8: Backfill existing users (idempotent)
insert into public.members (
  id, 
  email, 
  full_name,
  active_subscription, 
  subscription_tier
)
select 
  au.id, 
  au.email,
  coalesce(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'display_name',
    split_part(au.email, '@', 1)
  ),
  false,  -- Existing users default to no subscription
  'free'  -- Default tier
from auth.users au
where not exists (
  select 1 from public.members m where m.id = au.id
);

-- Step 9: Add helpful documentation
comment on column public.members.active_subscription is 
  'Gates dashboard access - true = paid subscriber, false = requires billing redirect';
comment on column public.members.subscription_tier is 
  'Determines feature access level (free/basic/premium)';
comment on column public.members.subscription_expires_at is 
  'UTC timestamp when subscription expires (null = no expiration)';
comment on column public.members.stripe_customer_id is 
  'Stripe customer ID for billing integration and webhooks';
comment on column public.members.stripe_subscription_id is 
  'Stripe subscription ID for status tracking';
comment on column public.members.stripe_price_id is 
  'Stripe price ID for tier identification';

-- =====================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- Run these after migration to verify success:
-- =====================================================
/*
-- 1. Check RLS is enabled and forced:
select relname, relrowsecurity, relforcerowsecurity 
from pg_class 
where relname = 'members';
-- Expected: relrowsecurity = true, relforcerowsecurity = true

-- 2. Verify our namespaced trigger exists:
select tgname, tgfoid::regprocedure
from pg_trigger 
where tgrelid = 'auth.users'::regclass
  and tgname = 'on_auth_user_created__members';
-- Expected: 1 row with our trigger

-- 3. Check grants are correct:
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' 
  and table_name = 'members'
  and grantee = 'authenticated';
-- Expected: SELECT privilege only at table level

-- 4. Verify column-level UPDATE is restricted:
select column_name, privilege_type
from information_schema.column_privileges
where table_schema = 'public' 
  and table_name = 'members' 
  and grantee = 'authenticated'
  and privilege_type = 'UPDATE';
-- Expected: Only 'full_name' and 'avatar_url' columns

-- 5. Test new user creation:
-- Sign up a test user and verify members row is created
-- with active_subscription = false, subscription_tier = 'free'
*/

-- =====================================================
-- FUTURE MIGRATION PATH (documented for next dev)
-- =====================================================
-- To move to family-level subscriptions:
-- 1. Add subscription columns to public.families instead
-- 2. Update auth helper to check via family_memberships JOIN
-- 3. Change SUBSCRIPTION_TABLE = 'families' in lib/server/subscription.ts
-- 4. Migration: Copy active subscriptions from members to families