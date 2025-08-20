-- Drop unsafe policy if it exists
drop policy if exists "exclude_soft_deleted" on public.children;

-- Always enable RLS
alter table public.children enable row level security;

-- Variant 2: owner-only access via families.owner_id
-- Since we don't have family_members table based on the codebase review

-- SELECT: Users can see children in families they own (excluding soft-deleted)
create policy "children_select_active_for_owner"
on public.children
for select
using (
  deleted_at is null
  and exists (
    select 1 from public.families f
    where f.id = children.family_id
      and f.created_by = auth.uid()
  )
);

-- INSERT: Users can create children in families they own
create policy "children_insert_for_owner"
on public.children
for insert
with check (
  deleted_at is null
  and exists (
    select 1 from public.families f
    where f.id = children.family_id
      and f.created_by = auth.uid()
  )
);

-- UPDATE: Users can update children in families they own
create policy "children_update_for_owner"
on public.children
for update
using (
  exists (
    select 1 from public.families f
    where f.id = children.family_id
      and f.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.families f
    where f.id = children.family_id
      and f.created_by = auth.uid()
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

-- Create trigger only if it doesn't exist
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