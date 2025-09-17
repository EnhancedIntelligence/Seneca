-- 20250916_memories_domain_model.sql
-- Core Memories Domain Model + RLS

-- Dependencies
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Types (idempotent guards to avoid collisions in dev)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'memory_kind') THEN
    CREATE TYPE memory_kind AS ENUM ('text', 'audio', 'image', 'video');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'memory_status') THEN
    CREATE TYPE memory_status AS ENUM ('draft', 'ready', 'processing', 'error');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_job_kind') THEN
    CREATE TYPE ai_job_kind AS ENUM ('embed', 'enrich', 'milestone');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_job_status') THEN
    CREATE TYPE ai_job_status AS ENUM ('queued', 'processing', 'done', 'error');
  END IF;
END$$;

-- memories
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  kind memory_kind NOT NULL,
  title TEXT,
  content TEXT, -- was "text"

  -- ADDED: length guards aligned with API
  CONSTRAINT chk_title_length  CHECK (title   IS NULL OR char_length(title)   <= 200),
  CONSTRAINT chk_content_length CHECK (content IS NULL OR char_length(content) <= 10000),

  -- ADDED: text memories must have content
  CONSTRAINT chk_text_requires_content CHECK (
    kind <> 'text'::memory_kind
    OR (content IS NOT NULL AND btrim(content) <> '')
  ),

  status memory_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- indexes for memories
CREATE INDEX IF NOT EXISTS idx_memories_user_created ON memories(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_child ON memories(child_id) WHERE child_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_memories_status_draft ON memories(status) WHERE status = 'draft';
CREATE INDEX IF NOT EXISTS idx_memories_status_processing ON memories(status) WHERE status = 'processing';
CREATE INDEX IF NOT EXISTS idx_memories_user_status_created ON memories(user_id, status, created_at DESC);

-- ADDED: Index for child timeline queries
CREATE INDEX IF NOT EXISTS idx_memories_child_status_created
ON memories(child_id, status, created_at DESC)
WHERE child_id IS NOT NULL;

-- media_assets
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  width INTEGER CHECK (width > 0),
  height INTEGER CHECK (height > 0),
  duration INTEGER CHECK (duration >= 0), -- seconds for audio/video
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_image_dimensions CHECK (
    mime_type NOT LIKE 'image/%'
    OR mime_type = 'image/svg+xml'
    OR (width IS NOT NULL AND height IS NOT NULL)
  ),
  CONSTRAINT check_media_duration CHECK (
    (mime_type NOT LIKE 'audio/%' AND mime_type NOT LIKE 'video/%')
    OR (duration IS NOT NULL)
  )
);

-- indexes for media_assets
CREATE UNIQUE INDEX IF NOT EXISTS uq_media_assets_storage_path ON media_assets(storage_path);
CREATE INDEX IF NOT EXISTS idx_media_assets_memory ON media_assets(memory_id);

-- ai_jobs
CREATE TABLE IF NOT EXISTS ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  kind ai_job_kind NOT NULL,
  status ai_job_status NOT NULL DEFAULT 'queued',
  cost_cents INTEGER DEFAULT 0 CHECK (cost_cents >= 0),
  attempts INTEGER DEFAULT 0 CHECK (attempts >= 0),
  error_message TEXT,
  result JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- indexes for ai_jobs
CREATE INDEX IF NOT EXISTS idx_ai_jobs_memory ON ai_jobs(memory_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status_queued ON ai_jobs(status, created_at) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status_processing ON ai_jobs(status) WHERE status = 'processing';
CREATE INDEX IF NOT EXISTS idx_ai_jobs_kind_status_created ON ai_jobs(kind, status, created_at);

-- prevent duplicate active jobs (queued/processing) per (memory, kind)
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_jobs_active ON ai_jobs(memory_id, kind)
WHERE status IN ('queued', 'processing');

-- RLS
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;

-- RLS: memories
DROP POLICY IF EXISTS "Users can view their own memories" ON memories;
CREATE POLICY "Users can view their own memories"
  ON memories FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own memories" ON memories;
CREATE POLICY "Users can create their own memories"
  ON memories FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      child_id IS NULL OR EXISTS (
        SELECT 1 FROM children c
        WHERE c.id = memories.child_id
          -- CONFIRMED: children table uses created_by for ownership
          AND c.created_by = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update their own memories" ON memories;
CREATE POLICY "Users can update their own memories"
  ON memories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      child_id IS NULL OR EXISTS (
        SELECT 1 FROM children c
        WHERE c.id = memories.child_id
          -- CONFIRMED: children table uses created_by for ownership
          AND c.created_by = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete their own memories" ON memories;
CREATE POLICY "Users can delete their own memories"
  ON memories FOR DELETE
  USING (auth.uid() = user_id);

-- RLS: media_assets inherit via join to memories
DROP POLICY IF EXISTS "Users can view media for their memories" ON media_assets;
CREATE POLICY "Users can view media for their memories"
  ON media_assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memories m
      WHERE m.id = media_assets.memory_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can add media to their memories" ON media_assets;
CREATE POLICY "Users can add media to their memories"
  ON media_assets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memories m
      WHERE m.id = media_assets.memory_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update media for their memories" ON media_assets;
CREATE POLICY "Users can update media for their memories"
  ON media_assets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memories m
      WHERE m.id = media_assets.memory_id
        AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memories m
      WHERE m.id = media_assets.memory_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete media for their memories" ON media_assets;
CREATE POLICY "Users can delete media for their memories"
  ON media_assets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM memories m
      WHERE m.id = media_assets.memory_id
        AND m.user_id = auth.uid()
    )
  );

-- RLS: ai_jobs
DROP POLICY IF EXISTS "Users can view AI jobs for their memories" ON ai_jobs;
CREATE POLICY "Users can view AI jobs for their memories"
  ON ai_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memories m
      WHERE m.id = ai_jobs.memory_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can manage AI jobs" ON ai_jobs;
CREATE POLICY "Service role can manage AI jobs"
  ON ai_jobs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_memories_updated_at ON memories;
CREATE TRIGGER update_memories_updated_at
  BEFORE UPDATE ON memories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_media_assets_updated_at ON media_assets;
CREATE TRIGGER update_media_assets_updated_at
  BEFORE UPDATE ON media_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_jobs_updated_at ON ai_jobs;
CREATE TRIGGER update_ai_jobs_updated_at
  BEFORE UPDATE ON ai_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- IMMUTABILITY TRIGGERS: Prevent changing critical fields after insert

-- Prevent changing user_id/kind on memories after insert
CREATE OR REPLACE FUNCTION forbid_memories_immutable_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'memories.user_id is immutable';
  END IF;
  IF NEW.kind IS DISTINCT FROM OLD.kind THEN
    RAISE EXCEPTION 'memories.kind is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS t_memories_immutable ON memories;
CREATE TRIGGER t_memories_immutable
  BEFORE UPDATE ON memories
  FOR EACH ROW
  EXECUTE FUNCTION forbid_memories_immutable_changes();

-- Prevent moving a media asset to a different memory
CREATE OR REPLACE FUNCTION forbid_media_assets_memory_move()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.memory_id IS DISTINCT FROM OLD.memory_id THEN
    RAISE EXCEPTION 'media_assets.memory_id is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS t_media_assets_memory_move ON media_assets;
CREATE TRIGGER t_media_assets_memory_move
  BEFORE UPDATE ON media_assets
  FOR EACH ROW
  EXECUTE FUNCTION forbid_media_assets_memory_move();

-- Comments
COMMENT ON TABLE memories IS 'Core memory records created by users';
COMMENT ON COLUMN memories.status IS 'draft: being edited, ready: complete, processing: AI running, error: AI failed';

COMMENT ON TABLE media_assets IS 'Media files associated with memories';
COMMENT ON COLUMN media_assets.size_bytes IS 'File size in bytes';
COMMENT ON COLUMN media_assets.duration IS 'Duration in seconds for audio/video';

COMMENT ON TABLE ai_jobs IS 'Background AI processing jobs for memories';
COMMENT ON COLUMN ai_jobs.cost_cents IS 'Cost in cents for API usage';
COMMENT ON COLUMN ai_jobs.attempts IS 'Number of retry attempts';