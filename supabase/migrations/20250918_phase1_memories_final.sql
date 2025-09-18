-- Phase 1: PRODUCTION-READY Schema Preparation for Memories Consolidation
-- This is SAFE and ADDITIVE - no data loss, no breaking changes
-- Date: 2025-09-18
-- Version: 3.0 - Final hardened version with all security fixes

-- Set explicit search path to prevent schema hijacking
SET search_path = public, pg_catalog;

-- ==============================================================================
-- STEP 1: Ensure all required types exist
-- ==============================================================================
DO $$
BEGIN
  -- Memory kind enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'memory_kind' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.memory_kind AS ENUM ('text', 'audio', 'image', 'video');
    COMMENT ON TYPE public.memory_kind IS 'Types of memory content - text for written, audio for voice, image for photos, video for clips';
  END IF;

  -- Memory status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'memory_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.memory_status AS ENUM ('draft', 'ready', 'processing', 'error');
    COMMENT ON TYPE public.memory_status IS 'Memory lifecycle states - draft (editing), ready (complete), processing (AI), error (failed)';
  END IF;

  -- Processing status enum (for compatibility)
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'processing_status_enum' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.processing_status_enum AS ENUM ('queued', 'processing', 'completed', 'failed');
    COMMENT ON TYPE public.processing_status_enum IS 'Legacy processing states - maps to memory_status for compatibility';
  END IF;
END$$;

-- ==============================================================================
-- STEP 2: Enable RLS on memories table (CRITICAL for security)
-- ==============================================================================
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
-- Not using FORCE so service role can still bypass for admin operations

-- ==============================================================================
-- STEP 3: Add missing columns to memories table (safe, nullable additions)
-- ==============================================================================
ALTER TABLE public.memories
ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS processing_priority INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_name TEXT,
ADD COLUMN IF NOT EXISTS app_context JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}', -- Explicit array type with empty default
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS memory_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS classification_confidence REAL,
ADD COLUMN IF NOT EXISTS milestone_detected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS milestone_type TEXT,
ADD COLUMN IF NOT EXISTS milestone_confidence REAL,
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}', -- Explicit array type with empty default
ADD COLUMN IF NOT EXISTS video_urls TEXT[] DEFAULT '{}', -- Explicit array type with empty default
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS source_table TEXT DEFAULT 'memories';

-- Add column comments for documentation
COMMENT ON COLUMN public.memories.source_table IS 'Provenance tracking - memories or memory_entries origin';
COMMENT ON COLUMN public.memories.memory_date IS 'Date the memory occurred (may differ from created_at)';
COMMENT ON COLUMN public.memories.classification_confidence IS 'AI confidence score 0-1 for category classification';
COMMENT ON COLUMN public.memories.milestone_confidence IS 'AI confidence score 0-1 for milestone detection';
COMMENT ON COLUMN public.memories.app_context IS 'Application metadata - UI state, feature flags, etc';

-- Add check constraints for data integrity
ALTER TABLE public.memories
ADD CONSTRAINT chk_processing_priority CHECK (processing_priority >= 0),
ADD CONSTRAINT chk_retry_count CHECK (retry_count >= 0),
ADD CONSTRAINT chk_location_lat CHECK (location_lat IS NULL OR (location_lat >= -90 AND location_lat <= 90)),
ADD CONSTRAINT chk_location_lng CHECK (location_lng IS NULL OR (location_lng >= -180 AND location_lng <= 180)),
ADD CONSTRAINT chk_classification_confidence CHECK (classification_confidence IS NULL OR (classification_confidence >= 0 AND classification_confidence <= 1)),
ADD CONSTRAINT chk_milestone_confidence CHECK (milestone_confidence IS NULL OR (milestone_confidence >= 0 AND milestone_confidence <= 1)),
ADD CONSTRAINT chk_source_table CHECK (source_table IN ('memories', 'memory_entries'));

-- ==============================================================================
-- STEP 4: Create SECURE compatibility view for legacy code
-- ==============================================================================
CREATE OR REPLACE VIEW public.memory_entries_vw
WITH (security_barrier = true) -- Prevent predicate pushdown attacks
AS
SELECT
  m.id,
  m.child_id,
  m.family_id,
  m.user_id AS created_by,
  m.title,
  m.content,
  -- Map memory_status to processing_status_enum
  CASE m.status
    WHEN 'draft' THEN 'queued'::public.processing_status_enum
    WHEN 'processing' THEN 'processing'::public.processing_status_enum
    WHEN 'ready' THEN 'completed'::public.processing_status_enum
    WHEN 'error' THEN 'failed'::public.processing_status_enum
  END AS processing_status,
  m.memory_date,
  m.category,
  m.tags,
  m.classification_confidence,
  m.milestone_detected,
  m.milestone_type,
  m.milestone_confidence,
  m.image_urls,
  m.video_urls,
  m.location_lat,
  m.location_lng,
  m.location_name,
  m.app_context,
  m.needs_review,
  m.processing_priority,
  m.retry_count,
  m.error_message,
  m.created_at,
  m.updated_at
FROM public.memories m;

COMMENT ON VIEW public.memory_entries_vw IS 'Compatibility view mapping memories table to legacy memory_entries structure - secured with barrier';

-- ==============================================================================
-- STEP 5: Create tracking tables for migration
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public._migration_state (
  id SERIAL PRIMARY KEY,
  phase TEXT NOT NULL UNIQUE, -- Ensure one row per phase
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_processed_id UUID,
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public._migration_checksums (
  memory_id UUID PRIMARY KEY,
  source_table TEXT NOT NULL CHECK (source_table IN ('memories', 'memory_entries')),
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- STEP 6: Create helper functions for safe migration (SECURITY INVOKER)
-- ==============================================================================

-- Function to calculate content checksum for verification
CREATE OR REPLACE FUNCTION public.calculate_memory_checksum(
  p_content TEXT,
  p_title TEXT,
  p_child_id UUID
) RETURNS TEXT
LANGUAGE sql IMMUTABLE STRICT
SECURITY INVOKER -- No elevated privileges needed for pure function
AS $$
  SELECT md5(
    COALESCE(p_content, '') ||
    '|' || COALESCE(p_title, '') ||
    '|' || COALESCE(p_child_id::TEXT, '')
  );
$$;

-- Function to map processing_status to memory_status
CREATE OR REPLACE FUNCTION public.map_processing_to_memory_status(
  p_processing_status public.processing_status_enum
) RETURNS public.memory_status
LANGUAGE sql IMMUTABLE STRICT
SECURITY INVOKER -- No elevated privileges needed for pure function
AS $$
  SELECT CASE p_processing_status
    WHEN 'queued' THEN 'draft'::public.memory_status
    WHEN 'processing' THEN 'processing'::public.memory_status
    WHEN 'completed' THEN 'ready'::public.memory_status
    WHEN 'failed' THEN 'error'::public.memory_status
  END;
$$;

-- ==============================================================================
-- STEP 7: Create indexes for new columns (non-concurrent for transactional safety)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_memories_family ON public.memories(family_id)
  WHERE family_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_memories_needs_review ON public.memories(needs_review)
  WHERE needs_review = true;
CREATE INDEX IF NOT EXISTS idx_memories_milestone ON public.memories(milestone_detected)
  WHERE milestone_detected = true;
CREATE INDEX IF NOT EXISTS idx_memories_source ON public.memories(source_table);
CREATE INDEX IF NOT EXISTS idx_memories_memory_date ON public.memories(memory_date DESC);
CREATE INDEX IF NOT EXISTS idx_memories_category ON public.memories(category)
  WHERE category IS NOT NULL;

-- Index for migration tracking
CREATE INDEX IF NOT EXISTS idx_migration_state_phase_status ON public._migration_state(phase, status);

-- ==============================================================================
-- STEP 8: Add COMPREHENSIVE RLS policies for memories table
-- ==============================================================================

-- Drop ALL existing policies to recreate with proper security
DROP POLICY IF EXISTS "Users can view their memories" ON public.memories;
DROP POLICY IF EXISTS "Users can insert their memories" ON public.memories;
DROP POLICY IF EXISTS "Users can update their memories" ON public.memories;
DROP POLICY IF EXISTS "Users can delete their memories" ON public.memories;
DROP POLICY IF EXISTS "Users can view family memories" ON public.memories;
DROP POLICY IF EXISTS "memories_select_policy" ON public.memories;
DROP POLICY IF EXISTS "memories_insert_policy" ON public.memories;
DROP POLICY IF EXISTS "memories_update_policy" ON public.memories;
DROP POLICY IF EXISTS "memories_delete_policy" ON public.memories;

-- SELECT: Users can view their own memories OR family memories they belong to
CREATE POLICY "memories_select_policy" ON public.memories
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    (family_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.family_memberships fm
      WHERE fm.family_id = memories.family_id
      AND fm.user_id = auth.uid()
    ))
  );

-- INSERT: Users can only insert their own memories (with optional family association)
CREATE POLICY "memories_insert_policy" ON public.memories
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      family_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.family_memberships fm
        WHERE fm.family_id = memories.family_id
        AND fm.user_id = auth.uid()
      )
    )
  );

-- UPDATE: Only memory owner can update (stricter security by default)
-- To allow family member updates, uncomment the OR clause
CREATE POLICY "memories_update_policy" ON public.memories
  FOR UPDATE
  USING (
    auth.uid() = user_id
    -- Uncomment to allow family admin/parent updates:
    -- OR (family_id IS NOT NULL AND EXISTS (
    --   SELECT 1 FROM public.family_memberships fm
    --   WHERE fm.family_id = memories.family_id
    --   AND fm.user_id = auth.uid()
    --   AND fm.role IN ('parent', 'admin')
    -- ))
  )
  WITH CHECK (
    auth.uid() = user_id
    -- Same family check for WITH CHECK if enabling family updates
  );

-- DELETE: Only memory owner can delete (no family deletion allowed)
CREATE POLICY "memories_delete_policy" ON public.memories
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add policy documentation
COMMENT ON POLICY "memories_select_policy" ON public.memories
  IS 'Owner or any member of same family can SELECT';
COMMENT ON POLICY "memories_insert_policy" ON public.memories
  IS 'Only owner can INSERT; family_id must belong to owner if provided';
COMMENT ON POLICY "memories_update_policy" ON public.memories
  IS 'Owner-only UPDATE (tight default). Uncomment role-based family edits when needed';
COMMENT ON POLICY "memories_delete_policy" ON public.memories
  IS 'Owner-only DELETE - no family member can delete others memories';

-- ==============================================================================
-- STEP 9: Log phase completion (idempotent)
-- ==============================================================================
INSERT INTO public._migration_state (phase, status, started_at, completed_at)
VALUES ('phase1_schema_prep', 'completed', NOW(), NOW())
ON CONFLICT (phase) DO UPDATE
SET status = 'completed',
    completed_at = NOW(),
    error_message = NULL;

-- ==============================================================================
-- VERIFICATION QUERIES (run these manually to confirm)
-- ==============================================================================
/*
-- Check RLS is enabled
SELECT tablename, rowsecurity, forcerowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'memories';

-- Check new columns exist with proper defaults
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'memories'
AND column_name IN ('family_id', 'tags', 'source_table', 'image_urls', 'video_urls')
ORDER BY ordinal_position;

-- Verify compatibility view works and has security barrier
SELECT schemaname, viewname, definition
FROM pg_views
WHERE schemaname = 'public' AND viewname = 'memory_entries_vw';

-- Check all constraints
SELECT conname, contype, consrc
FROM pg_constraint
WHERE conrelid = 'public.memories'::regclass
AND conname LIKE 'chk_%';

-- Check RLS policies with their definitions
SELECT schemaname, tablename, policyname, cmd, permissive, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'memories'
ORDER BY policyname;

-- Check policy comments
SELECT obj_description(oid) as comment, polname
FROM pg_policy
WHERE polrelid = 'public.memories'::regclass;

-- Migration state
SELECT * FROM public._migration_state ORDER BY created_at DESC;

-- Count records in both tables (if memory_entries exists)
SELECT 'memories' as table_name, COUNT(*) as count FROM public.memories
UNION ALL
SELECT 'memory_entries', COUNT(*) FROM public.memory_entries
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'memory_entries'
);
*/

-- ==============================================================================
-- ROLLBACK SCRIPT (save separately - DO NOT RUN unless needed)
-- ==============================================================================
/*
-- To rollback this migration:
DROP VIEW IF EXISTS public.memory_entries_vw;
DROP FUNCTION IF EXISTS public.calculate_memory_checksum(TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.map_processing_to_memory_status(public.processing_status_enum);
DROP TABLE IF EXISTS public._migration_checksums;
DROP TABLE IF EXISTS public._migration_state;

-- Removing columns requires more care - assess impact first
-- ALTER TABLE public.memories DROP COLUMN IF EXISTS family_id;
-- ... etc for each column

-- Restore original RLS policies if you have them backed up
*/

COMMENT ON TABLE public.memories IS 'Unified memory storage - Phase 1 PRODUCTION-READY prep completed 2025-09-18';