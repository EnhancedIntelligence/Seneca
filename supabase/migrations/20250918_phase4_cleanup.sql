-- Phase 4: Final cleanup and guardrails for memories consolidation
-- This migration locks down the old system and ensures only memories table is used
-- Date: 2025-09-18
-- SAFE TO RUN: Additive changes only, no data loss

BEGIN;

-- ==============================================================================
-- STEP 1: Lock down legacy table (if it exists)
-- ==============================================================================
DO $$
BEGIN
  -- If the legacy table exists, lock it down completely
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('memory_entries', '_memory_entries_legacy')
  ) THEN
    -- Enable RLS to enforce policies
    EXECUTE 'ALTER TABLE IF EXISTS public.memory_entries ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS public._memory_entries_legacy ENABLE ROW LEVEL SECURITY';

    -- Revoke all privileges from public and authenticated
    EXECUTE 'REVOKE ALL ON public.memory_entries FROM PUBLIC, authenticated, anon';
    EXECUTE 'REVOKE ALL ON public._memory_entries_legacy FROM PUBLIC, authenticated, anon';

    -- Create deny-all policy (only service role can access)
    EXECUTE 'DROP POLICY IF EXISTS deny_all ON public.memory_entries';
    EXECUTE 'DROP POLICY IF EXISTS deny_all ON public._memory_entries_legacy';

    EXECUTE 'CREATE POLICY deny_all ON public.memory_entries FOR ALL USING (false)';
    EXECUTE 'CREATE POLICY deny_all ON public._memory_entries_legacy FOR ALL USING (false)';

    RAISE NOTICE 'Legacy tables locked down - only service role can access';
  END IF;
END $$;

-- ==============================================================================
-- STEP 2: Ensure memories table has proper defaults and constraints
-- ==============================================================================
ALTER TABLE public.memories
  ALTER COLUMN status SET DEFAULT 'draft',
  ALTER COLUMN kind SET DEFAULT 'text';

-- Add check constraint for valid status transitions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_memories_status'
  ) THEN
    ALTER TABLE public.memories
    ADD CONSTRAINT chk_memories_status
    CHECK (status IN ('draft', 'processing', 'ready', 'error'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_memories_kind'
  ) THEN
    ALTER TABLE public.memories
    ADD CONSTRAINT chk_memories_kind
    CHECK (kind IN ('text', 'audio', 'image', 'video'));
  END IF;
END $$;

-- ==============================================================================
-- STEP 3: Create missing indexes for performance
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_memories_family_child
  ON public.memories (family_id, child_id)
  WHERE family_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_memories_status
  ON public.memories (status);

CREATE INDEX IF NOT EXISTS idx_memories_user_family
  ON public.memories (user_id, family_id)
  WHERE family_id IS NOT NULL;

-- GIN index for tags array
CREATE INDEX IF NOT EXISTS idx_memories_tags_gin
  ON public.memories USING GIN (tags)
  WHERE tags IS NOT NULL AND array_length(tags, 1) > 0;

-- ==============================================================================
-- STEP 4: Drop or replace legacy database functions
-- ==============================================================================
DO $$
BEGIN
  -- Drop legacy functions that reference memory_entries
  DROP FUNCTION IF EXISTS public.api_get_memory_entries CASCADE;
  DROP FUNCTION IF EXISTS public.api_get_memory_entries_table CASCADE;

  -- Log what was dropped
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname LIKE '%memory_entries%'
  ) THEN
    RAISE WARNING 'Found additional functions with memory_entries - review manually';
  END IF;
END $$;

-- ==============================================================================
-- STEP 5: Create replacement function for memories
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.api_get_memories(
  p_family_id UUID,
  p_child_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  child_id UUID,
  family_id UUID,
  kind TEXT,
  status TEXT,
  title TEXT,
  content TEXT,
  memory_date DATE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    m.id,
    m.user_id,
    m.child_id,
    m.family_id,
    m.kind::TEXT,
    m.status::TEXT,
    m.title,
    m.content,
    m.memory_date,
    m.created_at,
    m.updated_at
  FROM public.memories m
  WHERE m.family_id = p_family_id
    AND (p_child_id IS NULL OR m.child_id = p_child_id)
    AND EXISTS (
      SELECT 1 FROM public.family_memberships fm
      WHERE fm.family_id = m.family_id
        AND fm.user_id = auth.uid()
    )
  ORDER BY m.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

COMMENT ON FUNCTION public.api_get_memories IS
'Get memories for a family with RLS - replaces api_get_memory_entries';

-- ==============================================================================
-- STEP 6: Verify and strengthen RLS policies on memories
-- ==============================================================================

-- Drop all existing policies to recreate with proper security
DO $$
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'memories'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.memories', r.policyname);
  END LOOP;
END $$;

-- Enable RLS
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

-- Policy: Members can read memories in their families
CREATE POLICY memories_select_family ON public.memories
  FOR SELECT
  USING (
    family_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.family_memberships fm
      WHERE fm.family_id = memories.family_id
        AND fm.user_id = auth.uid()
    )
  );

-- Policy: Users can read their own memories (even without family)
CREATE POLICY memories_select_own ON public.memories
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can insert their own memories
CREATE POLICY memories_insert ON public.memories
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      family_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.family_memberships fm
        WHERE fm.family_id = memories.family_id
          AND fm.user_id = auth.uid()
      )
    )
  );

-- Policy: Users can update their own memories
CREATE POLICY memories_update_own ON public.memories
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Family admins can update family memories
CREATE POLICY memories_update_admin ON public.memories
  FOR UPDATE
  USING (
    family_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.family_memberships fm
      WHERE fm.family_id = memories.family_id
        AND fm.user_id = auth.uid()
        AND fm.role IN ('admin', 'parent')
    )
  )
  WITH CHECK (
    family_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.family_memberships fm
      WHERE fm.family_id = memories.family_id
        AND fm.user_id = auth.uid()
        AND fm.role IN ('admin', 'parent')
    )
  );

-- Policy: Only owners can delete
CREATE POLICY memories_delete ON public.memories
  FOR DELETE
  USING (user_id = auth.uid());

-- ==============================================================================
-- STEP 7: Drop legacy triggers if they exist
-- ==============================================================================
DROP TRIGGER IF EXISTS trg_sync_entries_to_memories ON public.memory_entries;
DROP TRIGGER IF EXISTS trg_sync_entries_to_memories ON public._memory_entries_legacy;
DROP FUNCTION IF EXISTS public.sync_entries_to_memories();

-- ==============================================================================
-- STEP 8: Add audit log entry
-- ==============================================================================
INSERT INTO public._log (key, val)
VALUES (
  'phase4_cleanup_complete',
  jsonb_build_object(
    'timestamp', NOW(),
    'action', 'Locked down legacy tables, strengthened RLS, created replacement functions',
    'memories_count', (SELECT COUNT(*) FROM public.memories),
    'indexes_created', 4,
    'policies_created', 6
  )::TEXT
)
ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;

-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================
/*
-- Check that legacy table is locked
SELECT has_table_privilege('authenticated', 'public.memory_entries', 'SELECT');
-- Should return FALSE

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'memories';
-- Should show rowsecurity = true

-- Check policies exist
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'memories';
-- Should return 6

-- Check indexes exist
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'memories'
AND indexname LIKE 'idx_memories%';

-- Check no functions reference memory_entries
SELECT proname
FROM pg_proc
WHERE prosrc LIKE '%memory_entries%'
AND pronamespace = 'public'::regnamespace;
-- Should return no rows
*/

COMMIT;

-- ==============================================================================
-- ROLLBACK SCRIPT (save separately)
-- ==============================================================================
/*
-- To rollback:
BEGIN;
-- Re-enable access to legacy tables
GRANT SELECT, INSERT, UPDATE ON public.memory_entries TO authenticated;
DROP POLICY deny_all ON public.memory_entries;

-- Restore old functions if backed up
-- CREATE OR REPLACE FUNCTION api_get_memory_entries...

-- Drop new function
DROP FUNCTION IF EXISTS public.api_get_memories;

-- Remove constraints
ALTER TABLE public.memories DROP CONSTRAINT IF EXISTS chk_memories_status;
ALTER TABLE public.memories DROP CONSTRAINT IF EXISTS chk_memories_kind;

COMMIT;
*/