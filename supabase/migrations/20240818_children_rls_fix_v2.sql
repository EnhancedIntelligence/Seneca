-- Drop unsafe policy if it exists
drop policy if exists "exclude_soft_deleted" on public.children;
drop policy if exists "children_select_active_for_owner" on public.children;
drop policy if exists "children_insert_for_owner" on public.children;
drop policy if exists "children_update_for_owner" on public.children;

-- Always enable RLS
alter table public.children enable row level security;

-- Variant 1: family_members-based (correct approach as we use family_memberships table)
create policy "children_select_active_for_members"
on public.children
for select
using (
  deleted_at is null
  and exists (
    select 1 from public.family_memberships fm
    where fm.family_id = children.family_id
      and fm.user_id = auth.uid()
      -- Check that membership is not revoked (if revoked_at column exists)
      -- and fm.revoked_at is null
  )
);

create policy "children_insert_for_members"
on public.children
for insert
with check (
  deleted_at is null
  and exists (
    select 1 from public.family_memberships fm
    where fm.family_id = children.family_id
      and fm.user_id = auth.uid()
      -- and fm.revoked_at is null
  )
);

create policy "children_update_for_members"
on public.children
for update
using (
  exists (
    select 1 from public.family_memberships fm
    where fm.family_id = children.family_id
      and fm.user_id = auth.uid()
      -- and fm.revoked_at is null
  )
)
with check (
  exists (
    select 1 from public.family_memberships fm
    where fm.family_id = children.family_id
      and fm.user_id = auth.uid()
      -- and fm.revoked_at is null
  )
);

-- No DELETE policy: force soft-delete via UPDATE to set deleted_at = now()

-- Partial index for active rows (if not already created)
create index if not exists children_family_active_idx
  on public.children (family_id)
  where deleted_at is null;

-- Ensure updated_at trigger exists (idempotent)
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'handle_children_updated_at'
  ) then
    create trigger handle_children_updated_at
      before update on public.children
      for each row
      execute function public.handle_updated_at();
  end if;
end $$;