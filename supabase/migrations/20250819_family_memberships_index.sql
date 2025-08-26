-- Add composite index for family_memberships pagination performance
-- This index supports efficient queries filtering by user_id and ordering by joined_at

CREATE INDEX IF NOT EXISTS family_memberships_user_joined_idx
ON public.family_memberships (user_id, joined_at DESC);

-- Also add index on family_id for efficient family member lookups
CREATE INDEX IF NOT EXISTS family_memberships_family_idx
ON public.family_memberships (family_id);

-- Add index on families.created_at for consistent ordering in list queries
CREATE INDEX IF NOT EXISTS families_created_at_idx
ON public.families (created_at DESC);

-- Comment the indexes for documentation
COMMENT ON INDEX family_memberships_user_joined_idx IS 'Composite index for efficient user-based pagination queries';
COMMENT ON INDEX family_memberships_family_idx IS 'Index for efficient family member lookups';
COMMENT ON INDEX families_created_at_idx IS 'Index for consistent ordering in family list queries';