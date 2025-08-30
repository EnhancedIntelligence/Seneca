-- Enable uuid generation if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Queue-specific enum
DO $$ BEGIN
  CREATE TYPE public.queue_status_enum AS ENUM ('queued','processing','completed','failed','delayed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Grant enum usage to service role
GRANT USAGE ON TYPE public.queue_status_enum TO service_role;

-- 2) Table with constraints for state coherence
CREATE TABLE IF NOT EXISTS public.queue_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.queue_status_enum NOT NULL DEFAULT 'queued',
  priority INT NOT NULL DEFAULT 0,
  attempts INT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INT NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
  scheduled_for TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  -- Ensure payload is always an object
  CONSTRAINT queue_jobs_payload_obj CHECK (jsonb_typeof(payload) = 'object'),
  -- State coherence checks
  CONSTRAINT queue_jobs_lock_pair_chk 
    CHECK ((locked_at IS NULL) = (locked_by IS NULL)),
  CONSTRAINT queue_jobs_processing_requires_lock_chk 
    CHECK (status <> 'processing' OR (locked_at IS NOT NULL AND locked_by IS NOT NULL)),
  CONSTRAINT queue_jobs_completed_requires_ts_chk 
    CHECK (status <> 'completed' OR completed_at IS NOT NULL)
);

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_queue_jobs_claim
  ON public.queue_jobs (status, priority DESC, created_at ASC)
  WHERE status = 'queued' AND locked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_queue_jobs_scheduled
  ON public.queue_jobs (scheduled_for)
  WHERE scheduled_for IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_queue_jobs_locked
  ON public.queue_jobs (locked_at)
  WHERE locked_at IS NOT NULL;

-- Index for worker operations
CREATE INDEX IF NOT EXISTS idx_queue_jobs_locked_by 
  ON public.queue_jobs (locked_by) 
  WHERE locked_by IS NOT NULL;

-- Optional: for dashboards
CREATE INDEX IF NOT EXISTS idx_queue_jobs_created_desc
  ON public.queue_jobs (created_at DESC);

-- 4) RLS
ALTER TABLE public.queue_jobs ENABLE ROW LEVEL SECURITY;

-- (No allow policies for authenticated/anon; service_role bypasses RLS.)

-- 5) updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_queue_jobs_set_updated_at ON public.queue_jobs;
CREATE TRIGGER trg_queue_jobs_set_updated_at
BEFORE UPDATE ON public.queue_jobs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6) Atomic claim function
CREATE OR REPLACE FUNCTION public.get_next_job_and_lock(p_worker_id TEXT)
RETURNS SETOF public.queue_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.queue_jobs;
BEGIN
  -- Pick one queued, ready job and lock it
  WITH next AS (
    SELECT id
    FROM public.queue_jobs
    WHERE status = 'queued'
      AND locked_at IS NULL
      AND (scheduled_for IS NULL OR scheduled_for <= NOW())
    ORDER BY priority DESC, created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.queue_jobs q
     SET status = 'processing',
         locked_by = p_worker_id,
         locked_at = NOW(),
         updated_at = NOW()
    FROM next
   WHERE q.id = next.id
  RETURNING q.* INTO v_job;

  IF FOUND THEN
    RETURN NEXT v_job;
  END IF;

  RETURN;
END
$$;

-- 7) Completion/failure helpers
-- Only ack jobs that are actually processing
CREATE OR REPLACE FUNCTION public.ack_complete(p_job_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH upd AS (
    UPDATE public.queue_jobs
       SET status = 'completed',
           completed_at = NOW(),
           locked_by = NULL,
           locked_at = NULL,
           updated_at = NOW()
     WHERE id = p_job_id
       AND status = 'processing'  -- Only complete jobs that are processing
     RETURNING 1
  )
  SELECT COUNT(*) > 0 FROM upd;
$$;

-- Handle failure only for eligible states
CREATE OR REPLACE FUNCTION public.handle_job_failure(p_job_id UUID, p_error TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  v_attempts INT; 
  v_max_attempts INT;
BEGIN
  SELECT q.attempts, q.max_attempts 
    INTO v_attempts, v_max_attempts
  FROM public.queue_jobs q 
  WHERE q.id = p_job_id
    AND q.status IN ('processing','queued')  -- Only fail jobs in these states
  FOR UPDATE;

  IF NOT FOUND THEN RETURN FALSE; END IF;

  IF v_attempts + 1 >= v_max_attempts THEN
    UPDATE public.queue_jobs
       SET status = 'failed',
           attempts = v_attempts + 1,
           error_message = p_error,
           locked_by = NULL,
           locked_at = NULL,
           updated_at = NOW()
     WHERE id = p_job_id
       AND status IN ('processing','queued');  -- Double-check status
  ELSE
    UPDATE public.queue_jobs
       SET status = 'queued',
           attempts = v_attempts + 1,
           error_message = p_error,
           locked_by = NULL,
           locked_at = NULL,
           updated_at = NOW()
     WHERE id = p_job_id
       AND status IN ('processing','queued');  -- Double-check status
  END IF;

  RETURN TRUE;
END
$$;

-- 8) Cleanup stuck jobs utility
CREATE OR REPLACE FUNCTION public.cleanup_stuck_jobs(p_timeout INTERVAL DEFAULT INTERVAL '30 minutes')
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH upd AS (
    UPDATE public.queue_jobs
       SET status = 'failed',
           error_message = COALESCE(error_message,'stuck timeout'),
           locked_by = NULL,
           locked_at = NULL,
           updated_at = NOW()
     WHERE status = 'processing'
       AND locked_at IS NOT NULL
       AND locked_at < NOW() - p_timeout
     RETURNING 1
  )
  SELECT COUNT(*)::INTEGER FROM upd;
$$;

-- 9) Stats function (marked as STABLE for read-only intent)
CREATE OR REPLACE FUNCTION public.get_job_statistics()
RETURNS TABLE(
  pending INT,
  processing INT,
  completed INT,
  failed INT,
  delayed INT
) 
LANGUAGE sql 
STABLE  -- Marked as STABLE (read-only, returns fresh values per transaction)
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE status = 'queued')::INT    AS pending,
    COUNT(*) FILTER (WHERE status = 'processing')::INT AS processing,
    COUNT(*) FILTER (WHERE status = 'completed')::INT  AS completed,
    COUNT(*) FILTER (WHERE status = 'failed')::INT     AS failed,
    COUNT(*) FILTER (WHERE status = 'delayed')::INT    AS delayed
  FROM public.queue_jobs;
$$;

-- 10) Enqueue helper for future use
CREATE OR REPLACE FUNCTION public.enqueue_job(
  p_type TEXT, 
  p_payload JSONB,
  p_priority INT DEFAULT 0, 
  p_scheduled_for TIMESTAMPTZ DEFAULT NULL, 
  p_max_attempts INT DEFAULT 5
)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.queue_jobs(type, payload, priority, scheduled_for, max_attempts)
  VALUES (p_type, COALESCE(p_payload,'{}'::jsonb), COALESCE(p_priority,0), p_scheduled_for, GREATEST(p_max_attempts,1))
  RETURNING id;
$$;

-- 11) Lock down function execution to service role only
REVOKE ALL ON FUNCTION public.get_next_job_and_lock(TEXT) FROM public, authenticated, anon;
REVOKE ALL ON FUNCTION public.ack_complete(UUID) FROM public, authenticated, anon;
REVOKE ALL ON FUNCTION public.handle_job_failure(UUID, TEXT) FROM public, authenticated, anon;
REVOKE ALL ON FUNCTION public.cleanup_stuck_jobs(INTERVAL) FROM public, authenticated, anon;
REVOKE ALL ON FUNCTION public.get_job_statistics() FROM public, authenticated, anon;
REVOKE ALL ON FUNCTION public.enqueue_job(TEXT, JSONB, INT, TIMESTAMPTZ, INT) FROM public, authenticated, anon;

GRANT EXECUTE ON FUNCTION public.get_next_job_and_lock(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.ack_complete(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_job_failure(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_stuck_jobs(INTERVAL) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_job_statistics() TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_job(TEXT, JSONB, INT, TIMESTAMPTZ, INT) TO service_role;

COMMENT ON TABLE public.queue_jobs IS 'Background job queue for async processing';
COMMENT ON COLUMN public.queue_jobs.priority IS 'Higher priority processed first (DESC)';
COMMENT ON FUNCTION public.cleanup_stuck_jobs IS 'Marks stuck processing jobs as failed after timeout (default 30 min)';
COMMENT ON FUNCTION public.enqueue_job IS 'Safe wrapper to enqueue new jobs with validation';