-- =====================================================
-- Members onboarding profile fields (v4 - Production Ready)
-- =====================================================
-- Purpose: Add comprehensive profile fields for user onboarding
-- Security: Uses auth.uid() internally, CITEXT for usernames, RLS enforcement
-- Author: Senior Dev Team
-- Date: 2025-09-03
-- Version: 4.0 (Final production version with NOT VALID constraints for safety)
-- =====================================================

-- 0) Extensions
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;

-- 1) Ensure timestamp columns exist first (critical for triggers)
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();

-- 2) Ensure email column exists (defensive - may or may not already exist)
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS email text;

-- 3) Add profile columns to existing members table
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS username citext UNIQUE,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_step int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb NOT NULL DEFAULT jsonb_build_object('email', true, 'sms', false, 'push', true),
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- 4) Add foreign key constraint to auth.users (with cascade delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE c.conname = 'members_id_fkey_auth_users'
      AND t.relname = 'members'
  ) THEN
    ALTER TABLE public.members
      ADD CONSTRAINT members_id_fkey_auth_users
      FOREIGN KEY (id) REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;
END$$;

-- 5) Add constraints with NOT VALID for production safety
-- This allows migration to succeed even if existing data doesn't conform
-- New/updated rows will be validated, existing rows can be fixed later
DO $$
BEGIN
  -- Age check constraint (COPPA compliance - 13+)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'members_age_check') THEN
    ALTER TABLE public.members
      ADD CONSTRAINT members_age_check
      CHECK (date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE - INTERVAL '13 years') NOT VALID;
    -- Attempt to validate existing data (will succeed if compliant, won't block migration if not)
    BEGIN
      ALTER TABLE public.members VALIDATE CONSTRAINT members_age_check;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Constraint members_age_check added but not validated. Validate manually later.';
    END;
  END IF;

  -- Username format constraint (3-30 chars, lowercase alphanumeric + underscore/hyphen)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'members_username_format') THEN
    ALTER TABLE public.members
      ADD CONSTRAINT members_username_format
      CHECK (username IS NULL OR username::text ~ '^[a-z0-9_][a-z0-9_-]{2,29}$') NOT VALID;
    BEGIN
      ALTER TABLE public.members VALIDATE CONSTRAINT members_username_format;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Constraint members_username_format added but not validated. Validate manually later.';
    END;
  END IF;

  -- Phone format constraint (E.164 format)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'members_phone_format') THEN
    ALTER TABLE public.members
      ADD CONSTRAINT members_phone_format
      CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\+[1-9]\d{1,14}$') NOT VALID;
    BEGIN
      ALTER TABLE public.members VALIDATE CONSTRAINT members_phone_format;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Constraint members_phone_format added but not validated. Validate manually later.';
    END;
  END IF;
END$$;

-- 6) Create performance indexes
CREATE INDEX IF NOT EXISTS idx_members_username
  ON public.members (username) WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_members_onboarding
  ON public.members (onboarding_completed_at) WHERE onboarding_completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_members_email
  ON public.members (email) WHERE email IS NOT NULL;

-- 7) Reserved usernames table and initial seed data
CREATE TABLE IF NOT EXISTS public.reserved_usernames(
  username citext PRIMARY KEY,
  reason text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Lock down access to reserved_usernames table
REVOKE ALL ON TABLE public.reserved_usernames FROM PUBLIC;
GRANT SELECT ON public.reserved_usernames TO authenticated;
GRANT SELECT ON public.reserved_usernames TO service_role;

-- Seed reserved usernames (comprehensive list)
INSERT INTO public.reserved_usernames (username, reason) VALUES
  ('admin', 'reserved'),
  ('root', 'reserved'),
  ('support', 'reserved'),
  ('system', 'reserved'),
  ('help', 'reserved'),
  ('about', 'reserved'),
  ('api', 'reserved'),
  ('auth', 'reserved'),
  ('app', 'reserved'),
  ('www', 'reserved'),
  ('mail', 'reserved'),
  ('email', 'reserved'),
  ('onboarding', 'reserved'),
  ('dashboard', 'reserved'),
  ('seneca', 'reserved'),
  ('protocol', 'reserved'),
  ('user', 'reserved'),
  ('users', 'reserved'),
  ('member', 'reserved'),
  ('members', 'reserved'),
  ('family', 'reserved'),
  ('families', 'reserved'),
  ('child', 'reserved'),
  ('children', 'reserved'),
  ('memory', 'reserved'),
  ('memories', 'reserved'),
  ('test', 'reserved'),
  ('demo', 'reserved'),
  ('null', 'reserved'),
  ('undefined', 'reserved'),
  ('private', 'reserved'),
  ('public', 'reserved'),
  ('billing', 'reserved'),
  ('settings', 'reserved'),
  ('profile', 'reserved')
ON CONFLICT DO NOTHING;

-- 8) Username normalization trigger (lowercase enforcement)
CREATE OR REPLACE FUNCTION public.normalize_username()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.username IS NOT NULL THEN
    NEW.username := LOWER(TRIM(NEW.username::text));
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_members_normalize_username ON public.members;
CREATE TRIGGER trg_members_normalize_username
  BEFORE INSERT OR UPDATE OF username ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.normalize_username();

-- 9) Reserved username blocking trigger
CREATE OR REPLACE FUNCTION public.block_reserved_usernames()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.username IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.reserved_usernames r WHERE r.username = NEW.username
  ) THEN
    RAISE EXCEPTION 'Username % is reserved', NEW.username USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_members_block_reserved ON public.members;
CREATE TRIGGER trg_members_block_reserved
  BEFORE INSERT OR UPDATE OF username ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.block_reserved_usernames();

-- 10) Ensure RLS is enabled and policies exist
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$
BEGIN
  -- Allow users to read their own row
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'members' AND policyname = 'members_select_own') THEN
    CREATE POLICY members_select_own ON public.members
      FOR SELECT USING (auth.uid() = id);
  END IF;

  -- Allow users to update their own row
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'members' AND policyname = 'members_update_own') THEN
    CREATE POLICY members_update_own ON public.members
      FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END$$;

-- 11) Create updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS members_touch_updated_at ON public.members;
CREATE TRIGGER members_touch_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW 
  EXECUTE FUNCTION public.touch_updated_at();

-- 12) RPC Functions with friendly error handling

-- A) Check username availability (with format validation)
CREATE OR REPLACE FUNCTION public.check_username_availability(p_username text)
RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
BEGIN
  -- Validate format first
  IF p_username IS NULL OR LENGTH(p_username) < 3 OR LENGTH(p_username) > 30 THEN
    RETURN jsonb_build_object('available', false, 'reason', 'INVALID_LENGTH');
  END IF;
  
  IF LOWER(p_username) !~ '^[a-z0-9_][a-z0-9_-]{2,29}$' THEN
    RETURN jsonb_build_object('available', false, 'reason', 'INVALID_FORMAT');
  END IF;

  -- Check if reserved
  IF EXISTS (SELECT 1 FROM public.reserved_usernames r WHERE r.username = LOWER(p_username)) THEN
    RETURN jsonb_build_object('available', false, 'reason', 'RESERVED');
  END IF;
  
  -- Check if taken
  IF EXISTS (SELECT 1 FROM public.members m WHERE m.username = LOWER(p_username)) THEN
    RETURN jsonb_build_object('available', false, 'reason', 'TAKEN');
  END IF;
  
  RETURN jsonb_build_object('available', true);
END$$;

-- Lock down execution and set owner
ALTER FUNCTION public.check_username_availability(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.check_username_availability(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_username_availability(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_username_availability(text) TO service_role;

-- B) Complete onboarding (with friendly error responses)
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_full_name text,
  p_username text,
  p_date_of_birth date,
  p_phone_e164 text,
  p_bio text DEFAULT NULL,
  p_preferences jsonb DEFAULT NULL,
  p_notification_preferences jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_age int;
  v_result jsonb;
BEGIN
  -- Check authentication
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'UNAUTHENTICATED', 'message', 'User not authenticated');
  END IF;

  -- Validate username format
  IF p_username IS NOT NULL THEN
    IF LENGTH(p_username) < 3 OR LENGTH(p_username) > 30 THEN
      RETURN jsonb_build_object('success', false, 'code', 'INVALID_USERNAME_LENGTH', 'message', 'Username must be 3-30 characters');
    END IF;
    
    IF LOWER(p_username) !~ '^[a-z0-9_][a-z0-9_-]{2,29}$' THEN
      RETURN jsonb_build_object('success', false, 'code', 'INVALID_USERNAME_FORMAT', 'message', 'Username can only contain letters, numbers, underscore and hyphen');
    END IF;
    
    -- Check if reserved
    IF EXISTS (SELECT 1 FROM public.reserved_usernames r WHERE r.username = LOWER(p_username)) THEN
      RETURN jsonb_build_object('success', false, 'code', 'USERNAME_RESERVED', 'message', 'This username is reserved');
    END IF;
  END IF;

  -- Age verification (COPPA compliance)
  IF p_date_of_birth IS NOT NULL THEN
    v_age := date_part('year', age(CURRENT_DATE, p_date_of_birth));
    IF v_age < 13 THEN
      RETURN jsonb_build_object('success', false, 'code', 'AGE_BELOW_MIN', 'message', 'You must be at least 13 years old to use this service');
    END IF;
  END IF;

  -- Phone format validation
  IF p_phone_e164 IS NOT NULL AND p_phone_e164 !~ '^\+[1-9]\d{1,14}$' THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_PHONE_FORMAT', 'message', 'Phone number must be in E.164 format (e.g., +14155551234)');
  END IF;

  -- Attempt to update profile
  BEGIN
    UPDATE public.members m
    SET 
      full_name = COALESCE(NULLIF(TRIM(p_full_name), ''), m.full_name),
      username = COALESCE(NULLIF(LOWER(TRIM(p_username)), ''), m.username),
      date_of_birth = COALESCE(p_date_of_birth, m.date_of_birth),
      phone_e164 = COALESCE(NULLIF(TRIM(p_phone_e164), ''), m.phone_e164),
      bio = COALESCE(NULLIF(TRIM(p_bio), ''), m.bio),
      preferences = COALESCE(p_preferences, m.preferences),
      notification_preferences = COALESCE(p_notification_preferences, m.notification_preferences),
      onboarding_completed_at = COALESCE(m.onboarding_completed_at, NOW()),
      updated_at = NOW()
    WHERE m.id = v_uid
    RETURNING jsonb_build_object(
      'success', true,
      'id', id,
      'username', username,
      'onboarding_completed_at', onboarding_completed_at,
      'message', 'Profile updated successfully'
    ) INTO v_result;
    
  EXCEPTION 
    WHEN unique_violation THEN
      RETURN jsonb_build_object('success', false, 'code', 'USERNAME_TAKEN', 'message', 'This username is already taken');
    WHEN check_violation THEN
      -- This catches reserved username or other check constraint violations
      RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'message', 'Profile validation failed');
    WHEN OTHERS THEN
      -- Log the actual error for debugging but return generic message
      RAISE WARNING 'Onboarding error for user %: %', v_uid, SQLERRM;
      RETURN jsonb_build_object('success', false, 'code', 'UNKNOWN_ERROR', 'message', 'An unexpected error occurred');
  END;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'MEMBER_NOT_FOUND', 'message', 'Member profile not found');
  END IF;

  RETURN v_result;
END$$;

-- Lock down execution and set owner
ALTER FUNCTION public.complete_onboarding(text,text,date,text,text,jsonb,jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.complete_onboarding(text,text,date,text,text,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(text,text,date,text,text,jsonb,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(text,text,date,text,text,jsonb,jsonb) TO service_role;

-- C) Update onboarding step (for multi-step form tracking)
CREATE OR REPLACE FUNCTION public.update_onboarding_step(p_step int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'UNAUTHENTICATED');
  END IF;

  IF p_step < 1 OR p_step > 10 THEN -- Reasonable limit
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_STEP');
  END IF;

  UPDATE public.members
  SET onboarding_step = p_step,
      updated_at = NOW()
  WHERE id = v_uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'MEMBER_NOT_FOUND');
  END IF;
  
  RETURN jsonb_build_object('success', true, 'step', p_step);
END$$;

-- Lock down execution and set owner
ALTER FUNCTION public.update_onboarding_step(int) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.update_onboarding_step(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_onboarding_step(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_onboarding_step(int) TO service_role;

-- 13) Handle new user signup (create member row automatically)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
BEGIN
  INSERT INTO public.members (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE 
  SET email = EXCLUDED.email,
      updated_at = NOW();
  
  RETURN NEW;
END$$;

-- Only create trigger if not exists (avoid errors on re-run)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created' 
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END$$;

-- 14) Grant minimal permissions (RLS handles row-level access)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.members TO authenticated;
-- Note: No UPDATE grants needed - RLS policies handle this

-- 15) Add helpful comments for documentation
COMMENT ON TABLE public.members IS 'User profiles with comprehensive onboarding fields and subscription management';
COMMENT ON COLUMN public.members.username IS 'Case-insensitive unique handle (3-30 chars, a-z, 0-9, _ and -)';
COMMENT ON COLUMN public.members.date_of_birth IS 'User birth date for age verification (must be 13+ for COPPA compliance)';
COMMENT ON COLUMN public.members.phone_e164 IS 'Phone number in E.164 format (+14155551234)';
COMMENT ON COLUMN public.members.onboarding_completed_at IS 'Timestamp when user completed onboarding flow';
COMMENT ON COLUMN public.members.onboarding_step IS 'Current step in multi-step onboarding wizard';
COMMENT ON COLUMN public.members.preferences IS 'User preferences for app behavior (JSON)';
COMMENT ON COLUMN public.members.notification_preferences IS 'Notification channel preferences (email, sms, push)';
COMMENT ON COLUMN public.members.bio IS 'User bio/about text';
COMMENT ON COLUMN public.members.avatar_url IS 'URL to user avatar image';

-- 16) Production validation queries (run after migration)
/*
-- Validation Script - Run these after migration to verify success:

-- 1. Check constraints status (look for NOT VALID ones to validate later)
SELECT conname, convalidated 
FROM pg_constraint 
WHERE conrelid = 'public.members'::regclass 
AND contype = 'c';

-- 2. Verify username availability RPC
SELECT public.check_username_availability('alice');  -- {"available": true}
SELECT public.check_username_availability('admin');  -- {"available": false, "reason": "RESERVED"}
SELECT public.check_username_availability('al');     -- {"available": false, "reason": "INVALID_LENGTH"}

-- 3. Verify RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'members';

-- 4. Verify function permissions (should show only authenticated and service_role)
SELECT proname, pronamespace::regnamespace, proacl 
FROM pg_proc 
WHERE proname IN ('check_username_availability', 'complete_onboarding', 'update_onboarding_step');

-- 5. Find any existing data that violates constraints (for cleanup)
-- Age violations:
SELECT id, email, date_of_birth 
FROM public.members 
WHERE date_of_birth > CURRENT_DATE - INTERVAL '13 years';

-- Username format violations:
SELECT id, email, username 
FROM public.members 
WHERE username IS NOT NULL 
AND username::text !~ '^[a-z0-9_][a-z0-9_-]{2,29}$';

-- Phone format violations:
SELECT id, email, phone_e164 
FROM public.members 
WHERE phone_e164 IS NOT NULL 
AND phone_e164 !~ '^\+[1-9]\d{1,14}$';

-- 6. Manually validate constraints after fixing any violations
-- ALTER TABLE public.members VALIDATE CONSTRAINT members_age_check;
-- ALTER TABLE public.members VALIDATE CONSTRAINT members_username_format;
-- ALTER TABLE public.members VALIDATE CONSTRAINT members_phone_format;
*/