-- Allow null birth_date (if currently NOT NULL)
alter table if exists public.children
  alter column birth_date drop not null;

-- Add soft-delete column if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='children' and column_name='deleted_at'
  ) then
    alter table public.children add column deleted_at timestamp with time zone;
    create index if not exists idx_children_deleted_at on public.children(deleted_at);
  end if;
end $$;

-- Helpful indexes
create index if not exists idx_children_family on public.children(family_id);

-- Partial index for active children (much more efficient for queries)
create index if not exists idx_children_family_active 
  on public.children(family_id) 
  where deleted_at is null;

-- Add RLS policy to exclude soft-deleted children
alter table public.children enable row level security;

-- Policy to exclude soft-deleted records at database level
create policy "exclude_soft_deleted" on public.children
  for all
  using (deleted_at is null);

-- Trigger to auto-update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger if it doesn't exist
do $$
begin
  if not exists (
    select 1 from pg_trigger 
    where tgname = 'handle_children_updated_at'
  ) then
    create trigger handle_children_updated_at
      before update on public.children
      for each row
      execute function public.handle_updated_at();
  end if;
end $$;