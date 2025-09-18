-- Phase 2: PRODUCTION-READY Dual-Write Triggers and FK Repointing
-- Date: 2025-09-18
-- Version: 3.0 - Final with all senior review fixes
-- Prerequisites: Phase 1 must be completed

SET search_path = public, pg_catalog;

-- ==============================================================================
-- STEP 1: Acquire advisory lock to prevent concurrent runs
-- ==============================================================================
-- Use a stable hash for project-specific lock
SELECT pg_advisory_lock(hashtext('seneca_phase2_dual_write_fk'));

-- ==============================================================================
-- STEP 2: Check current state and log migration start
-- ==============================================================================
DO $$
DECLARE
  v_memories_count INTEGER;
  v_entries_count INTEGER;
  v_embeddings_count INTEGER;
  v_analytics_count INTEGER;
BEGIN
  -- Get current counts for audit trail
  SELECT COUNT(*) INTO v_memories_count FROM public.memories;
  SELECT COUNT(*) INTO v_entries_count FROM public.memory_entries;
  SELECT COUNT(*) INTO v_embeddings_count FROM public.embeddings_index;
  SELECT COUNT(*) INTO v_analytics_count FROM public.processing_analytics;

  RAISE NOTICE 'Phase 2 starting - memories: %, memory_entries: %, embeddings: %, analytics: %',
    v_memories_count, v_entries_count, v_embeddings_count, v_analytics_count;

  -- Record migration start
  INSERT INTO public._migration_state (phase, status, started_at)
  VALUES ('phase2_dual_write_fk', 'running', NOW())
  ON CONFLICT (phase) DO UPDATE
  SET status = 'running',
      started_at = NOW(),
      error_message = NULL,
      completed_at = NULL;
END $$;

-- ==============================================================================
-- STEP 3: Create UPSERT dual-write trigger (memory_entries → memories)
-- ==============================================================================

-- NOTE: SECURITY INVOKER relies on non-FORCE RLS or service role during migration.
-- If FORCE RLS is enabled in future, add service policy or convert to DEFINER with restricted search_path.

-- Function to sync memory_entries changes to memories using UPSERT pattern
CREATE OR REPLACE FUNCTION public.sync_entries_to_memories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Handle INSERT and UPDATE with UPSERT pattern
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    INSERT INTO public.memories (
      id,
      user_id,
      child_id,
      family_id,
      kind,
      title,
      content,
      status,
      category,
      tags,
      memory_date,
      classification_confidence,
      milestone_detected,
      milestone_type,
      milestone_confidence,
      image_urls,
      video_urls,
      location_lat,
      location_lng,
      location_name,
      app_context,
      needs_review,
      processing_priority,
      retry_count,
      error_message,
      source_table,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.created_by,
      NEW.child_id,
      NEW.family_id,
      'text'::public.memory_kind, -- Default to text for legacy entries
      NEW.title,
      NEW.content,
      CASE NEW.processing_status
        WHEN 'queued' THEN 'draft'::public.memory_status
        WHEN 'processing' THEN 'processing'::public.memory_status
        WHEN 'completed' THEN 'ready'::public.memory_status
        WHEN 'failed' THEN 'error'::public.memory_status
      END,
      NEW.category,
      NEW.tags,
      NEW.memory_date,
      NEW.classification_confidence,
      NEW.milestone_detected,
      NEW.milestone_type,
      NEW.milestone_confidence,
      NEW.image_urls,
      NEW.video_urls,
      NEW.location_lat,
      NEW.location_lng,
      NEW.location_name,
      NEW.app_context,
      NEW.needs_review,
      NEW.processing_priority,
      NEW.retry_count,
      NEW.error_message,
      'memory_entries', -- Mark source for audit
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      child_id = EXCLUDED.child_id,
      family_id = EXCLUDED.family_id,
      title = EXCLUDED.title,
      content = EXCLUDED.content,
      status = EXCLUDED.status,
      category = EXCLUDED.category,
      tags = EXCLUDED.tags,
      memory_date = EXCLUDED.memory_date,
      classification_confidence = EXCLUDED.classification_confidence,
      milestone_detected = EXCLUDED.milestone_detected,
      milestone_type = EXCLUDED.milestone_type,
      milestone_confidence = EXCLUDED.milestone_confidence,
      image_urls = EXCLUDED.image_urls,
      video_urls = EXCLUDED.video_urls,
      location_lat = EXCLUDED.location_lat,
      location_lng = EXCLUDED.location_lng,
      location_name = EXCLUDED.location_name,
      app_context = EXCLUDED.app_context,
      needs_review = EXCLUDED.needs_review,
      processing_priority = EXCLUDED.processing_priority,
      retry_count = EXCLUDED.retry_count,
      error_message = EXCLUDED.error_message,
      source_table = memories.source_table, -- KEEP existing provenance - don't overwrite
      updated_at = EXCLUDED.updated_at
    WHERE memories.source_table = 'memory_entries'; -- Only update if from same source

  ELSIF TG_OP = 'DELETE' THEN
    -- Don't cascade deletes - keep for audit trail
    -- If you need to sync deletes, uncomment:
    -- DELETE FROM public.memories WHERE id = OLD.id AND source_table = 'memory_entries';
    NULL;
  END IF;

  RETURN NEW;
END $$;

-- Document the function behavior
COMMENT ON FUNCTION public.sync_entries_to_memories() IS
'UPSERT dual-write from memory_entries to memories; only updates rows whose source_table = ''memory_entries'' to avoid overwriting native memories.';

-- Create the trigger
DROP TRIGGER IF EXISTS trg_sync_entries_to_memories ON public.memory_entries;
CREATE TRIGGER trg_sync_entries_to_memories
AFTER INSERT OR UPDATE ON public.memory_entries
FOR EACH ROW
EXECUTE FUNCTION public.sync_entries_to_memories();

COMMENT ON TRIGGER trg_sync_entries_to_memories ON public.memory_entries IS
'Dual-write trigger to sync memory_entries changes to memories during migration - UPSERT pattern with provenance guard';

-- ==============================================================================
-- STEP 4: Backfill existing memory_entries → memories
-- ==============================================================================

-- Log backfill start
DO $$
DECLARE
  v_before_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_before_count FROM public.memories;
  RAISE NOTICE 'Starting backfill. Current memories count: %', v_before_count;

  -- Log to audit table
  INSERT INTO public._log(key, val)
  VALUES('phase2_backfill_start', 'count: ' || v_before_count || ' at ' || NOW()::text)
  ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
END $$;

-- Batch insert memory_entries that don't exist in memories
-- NOTE: For very large tables, consider batched approach with last_processed_id
INSERT INTO public.memories (
  id,
  user_id,
  child_id,
  family_id,
  kind,
  title,
  content,
  status,
  category,
  tags,
  memory_date,
  classification_confidence,
  milestone_detected,
  milestone_type,
  milestone_confidence,
  image_urls,
  video_urls,
  location_lat,
  location_lng,
  location_name,
  app_context,
  needs_review,
  processing_priority,
  retry_count,
  error_message,
  source_table,
  created_at,
  updated_at
)
SELECT
  me.id,
  me.created_by,
  me.child_id,
  me.family_id,
  'text'::public.memory_kind,
  me.title,
  me.content,
  CASE me.processing_status
    WHEN 'queued' THEN 'draft'::public.memory_status
    WHEN 'processing' THEN 'processing'::public.memory_status
    WHEN 'completed' THEN 'ready'::public.memory_status
    WHEN 'failed' THEN 'error'::public.memory_status
  END,
  me.category,
  me.tags,
  me.memory_date,
  me.classification_confidence,
  me.milestone_detected,
  me.milestone_type,
  me.milestone_confidence,
  me.image_urls,
  me.video_urls,
  me.location_lat,
  me.location_lng,
  me.location_name,
  me.app_context,
  me.needs_review,
  me.processing_priority,
  me.retry_count,
  me.error_message,
  'memory_entries',
  me.created_at,
  me.updated_at
FROM public.memory_entries me
WHERE NOT EXISTS (
  SELECT 1 FROM public.memories m WHERE m.id = me.id
);

-- Log backfill completion
DO $$
DECLARE
  v_after_count INTEGER;
  v_inserted INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_after_count FROM public.memories;
  SELECT COUNT(*) INTO v_inserted FROM public.memories WHERE source_table = 'memory_entries';
  RAISE NOTICE 'Backfill complete. Memories: %, From entries: %', v_after_count, v_inserted;

  -- Log to audit table
  INSERT INTO public._log(key, val)
  VALUES('phase2_backfill_complete', 'total: ' || v_after_count || ', from_entries: ' || v_inserted || ' at ' || NOW()::text)
  ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
END $$;

-- ==============================================================================
-- STEP 5: Add checksums for verification
-- ==============================================================================

-- Add checksums for all migrated records
INSERT INTO public._migration_checksums (memory_id, source_table, content_hash)
SELECT
  id,
  'memory_entries',
  public.calculate_memory_checksum(content, title, child_id)
FROM public.memory_entries
ON CONFLICT (memory_id) DO UPDATE
SET content_hash = EXCLUDED.content_hash,
    source_table = EXCLUDED.source_table;

-- ==============================================================================
-- STEP 6: Repoint foreign keys with NOT VALID for reduced locks
-- ==============================================================================

-- Drop old constraints
ALTER TABLE public.embeddings_index
  DROP CONSTRAINT IF EXISTS embeddings_index_memory_id_fkey;

ALTER TABLE public.processing_analytics
  DROP CONSTRAINT IF EXISTS processing_analytics_memory_id_fkey;

-- Add new constraints with NOT VALID to reduce initial lock time
ALTER TABLE public.embeddings_index
  ADD CONSTRAINT embeddings_index_memory_id_fkey
  FOREIGN KEY (memory_id) REFERENCES public.memories(id)
  ON DELETE CASCADE NOT VALID;

ALTER TABLE public.processing_analytics
  ADD CONSTRAINT processing_analytics_memory_id_fkey
  FOREIGN KEY (memory_id) REFERENCES public.memories(id)
  ON DELETE CASCADE NOT VALID;

-- Validate constraints separately (can be done with reduced locking)
ALTER TABLE public.embeddings_index
  VALIDATE CONSTRAINT embeddings_index_memory_id_fkey;

ALTER TABLE public.processing_analytics
  VALIDATE CONSTRAINT processing_analytics_memory_id_fkey;

-- ==============================================================================
-- STEP 7: Verification and migration state update (FIXED logic)
-- ==============================================================================

DO $$
DECLARE
  v_memories_after INTEGER;
  v_entries_count INTEGER;
  v_mismatch_count INTEGER;
  v_checksum_mismatch INTEGER;
BEGIN
  -- Get final counts
  SELECT COUNT(*) INTO v_memories_after FROM public.memories;
  SELECT COUNT(*) INTO v_entries_count FROM public.memory_entries;

  -- Check for missing records
  SELECT COUNT(*) INTO v_mismatch_count
  FROM public.memory_entries me
  LEFT JOIN public.memories m ON m.id = me.id
  WHERE m.id IS NULL;

  -- Check for content mismatches (sample)
  SELECT COUNT(*) INTO v_checksum_mismatch
  FROM (
    SELECT me.id
    FROM public.memory_entries me
    JOIN public.memories m ON m.id = me.id
    WHERE public.calculate_memory_checksum(me.content, me.title, me.child_id) !=
          public.calculate_memory_checksum(m.content, m.title, m.child_id)
    LIMIT 100
  ) AS mismatches;

  -- Only mark completed if everything matches
  IF v_mismatch_count = 0 AND v_checksum_mismatch = 0 THEN
    UPDATE public._migration_state
    SET
      status = 'completed',
      completed_at = NOW(),
      records_processed = v_memories_after
    WHERE phase = 'phase2_dual_write_fk';

    RAISE NOTICE 'Phase 2 SUCCESSFUL - memories: %, entries: %, missing: 0, checksum_errors: 0',
      v_memories_after, v_entries_count;

    -- Log success
    INSERT INTO public._log(key, val)
    VALUES('phase2_dual_write_fk', 'success: ' || NOW()::text || ' (memories: ' || v_memories_after || ')')
    ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;

  ELSE
    -- Mark as failed if there are mismatches
    UPDATE public._migration_state
    SET
      status = 'failed',
      error_message = format('Missing: %s records, Checksum mismatches: %s',
                            v_mismatch_count, v_checksum_mismatch),
      completed_at = NOW()
    WHERE phase = 'phase2_dual_write_fk';

    -- Log failure
    INSERT INTO public._log(key, val)
    VALUES('phase2_dual_write_fk', 'failed: ' || NOW()::text || ' (missing: ' || v_mismatch_count || ', checksum_errors: ' || v_checksum_mismatch || ')')
    ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;

    -- Raise exception to rollback transaction
    RAISE EXCEPTION 'Phase 2 FAILED - Missing: %, Checksum errors: %',
      v_mismatch_count, v_checksum_mismatch;
  END IF;
END $$;

-- ==============================================================================
-- STEP 8: Analyze tables after heavy writes for query plan stability
-- ==============================================================================
ANALYZE public.memories;
ANALYZE public.embeddings_index;
ANALYZE public.processing_analytics;

-- ==============================================================================
-- STEP 9: Release advisory lock
-- ==============================================================================
SELECT pg_advisory_unlock(hashtext('seneca_phase2_dual_write_fk'));

-- ==============================================================================
-- VERIFICATION QUERIES (run these manually after migration)
-- ==============================================================================
/*
-- 1. Verify all memory_entries exist in memories
SELECT COUNT(*) as missing_count
FROM public.memory_entries me
LEFT JOIN public.memories m ON m.id = me.id
WHERE m.id IS NULL;

-- 2. Verify foreign keys now point to memories
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS references_table
FROM pg_constraint
WHERE contype = 'f'
AND conrelid IN ('public.embeddings_index'::regclass, 'public.processing_analytics'::regclass)
AND conname LIKE '%memory_id%';

-- 3. Check dual-write trigger is active
SELECT
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  tgfoid::regproc AS function_name,
  tgenabled AS enabled
FROM pg_trigger
WHERE tgname = 'trg_sync_entries_to_memories';

-- 4. Verify content integrity (random sample - increase LIMIT for stronger check)
SELECT
  me.id,
  me.title AS entry_title,
  m.title AS memory_title,
  public.calculate_memory_checksum(me.content, me.title, me.child_id) =
  public.calculate_memory_checksum(m.content, m.title, m.child_id) AS content_matches,
  m.source_table
FROM public.memory_entries me
JOIN public.memories m ON m.id = me.id
ORDER BY RANDOM()
LIMIT 100;

-- 5. Check migration state
SELECT * FROM public._migration_state
WHERE phase = 'phase2_dual_write_fk';

-- 6. Count by source
SELECT
  source_table,
  COUNT(*) as count
FROM public.memories
GROUP BY source_table
ORDER BY source_table;

-- 7. Verify RLS still works
SET ROLE authenticated;
-- Try selecting memories (should work per policies)
SELECT COUNT(*) FROM public.memories;
RESET ROLE;

-- 8. Check audit logs
SELECT * FROM public._log
WHERE key IN ('phase2_backfill_start', 'phase2_backfill_complete', 'phase2_dual_write_fk')
ORDER BY key;
*/

-- ==============================================================================
-- PHASE 3 PLANNING (not executed here - next steps)
-- ==============================================================================
/*
After Phase 2 is verified and stable:

1. FREEZE memory_entries:
   REVOKE INSERT, UPDATE, DELETE ON public.memory_entries FROM authenticated;
   REVOKE INSERT, UPDATE, DELETE ON public.memory_entries FROM anon;
   COMMENT ON TABLE public.memory_entries IS 'FROZEN - Read-only legacy table. All writes go to memories table.';

2. Optional: Rename to make it clear:
   ALTER TABLE public.memory_entries RENAME TO _memory_entries_legacy;

3. Create read-only view for legacy consumers:
   CREATE VIEW public.memory_entries AS SELECT * FROM public.memory_entries_vw;
   GRANT SELECT ON public.memory_entries TO authenticated;

4. After bake period, drop trigger:
   DROP TRIGGER trg_sync_entries_to_memories ON public._memory_entries_legacy;
   DROP FUNCTION public.sync_entries_to_memories();

5. Final cleanup (after confirming no issues):
   DROP TABLE public._memory_entries_legacy CASCADE;
*/

-- ==============================================================================
-- ROLLBACK SCRIPT (save separately - ONLY if needed)
-- ==============================================================================
/*
-- PHASE 2 ROLLBACK:

-- 1. Acquire lock
SELECT pg_advisory_lock(hashtext('seneca_phase2_dual_write_fk'));

-- 2. Drop trigger and function
DROP TRIGGER IF EXISTS trg_sync_entries_to_memories ON public.memory_entries;
DROP FUNCTION IF EXISTS public.sync_entries_to_memories();

-- 3. Restore original FKs (pointing to memory_entries)
ALTER TABLE public.embeddings_index
  DROP CONSTRAINT IF EXISTS embeddings_index_memory_id_fkey,
  ADD CONSTRAINT embeddings_index_memory_id_fkey
  FOREIGN KEY (memory_id) REFERENCES public.memory_entries(id) ON DELETE CASCADE;

ALTER TABLE public.processing_analytics
  DROP CONSTRAINT IF EXISTS processing_analytics_memory_id_fkey,
  ADD CONSTRAINT processing_analytics_memory_id_fkey
  FOREIGN KEY (memory_id) REFERENCES public.memory_entries(id) ON DELETE CASCADE;

-- 4. Remove migrated records (optional - be careful!)
-- DELETE FROM public.memories WHERE source_table = 'memory_entries';

-- 5. Update migration state
UPDATE public._migration_state
SET status = 'failed',
    error_message = 'Manually rolled back',
    completed_at = NOW()
WHERE phase = 'phase2_dual_write_fk';

-- 6. Log rollback
INSERT INTO public._log(key, val)
VALUES('phase2_dual_write_fk_rollback', 'rolled back at ' || NOW()::text)
ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;

-- 7. Release lock
SELECT pg_advisory_unlock(hashtext('seneca_phase2_dual_write_fk'));
*/

COMMENT ON TABLE public.memories IS 'Unified memory storage - Phase 2 FINAL dual-write with FK repoint completed 2025-09-18';