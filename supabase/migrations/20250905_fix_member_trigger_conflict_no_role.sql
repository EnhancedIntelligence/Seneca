-- Fix conflicting member auto-creation triggers (NO ROLE SWITCHING VERSION)
-- This migration works without needing supabase_auth_admin role permissions
--
-- STEP 1: Run this command FIRST in SQL Editor to clean up the legacy trigger:
-- DROP FUNCTION IF EXISTS public.handle_new_user_members() CASCADE;
--
-- STEP 2: Then run the rest of this migration

-- Preview what will be dropped (optional - run before CASCADE)
-- SELECT t.tgname, c.relname AS table_name, n.nspname AS schema_name
-- FROM pg_trigger t
-- JOIN pg_proc p ON p.oid = t.tgfoid
-- JOIN pg_class c ON c.oid = t.tgrelid
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE p.proname = 'handle_new_user_members';

-- 1) Drop any remaining functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.sync_member_email();

-- 2) Create unified insert function with NULL email handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.members (
    id,
    email,
    full_name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    -- Handle NULL emails from providers that don't require email
    COALESCE(
      NEW.email,
      CONCAT('user+', NEW.id::text, '@placeholder.seneca.local')
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'display_name',
      CASE 
        WHEN NEW.email IS NOT NULL THEN split_part(NEW.email, '@', 1)
        ELSE CONCAT('user_', substring(NEW.id::text from 1 for 8))
      END
    ),
    timezone('utc', now()),
    timezone('utc', now())
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = timezone('utc', now())
  WHERE members.email IS DISTINCT FROM EXCLUDED.email;

  RETURN NEW;
END
$$;

-- Lock down trigger function permissions
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- 3) Create email sync function
CREATE OR REPLACE FUNCTION public.sync_member_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only sync if email actually changed
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.members
    SET 
      email = COALESCE(
        NEW.email,
        CONCAT('user+', NEW.id::text, '@placeholder.seneca.local')
      ),
      updated_at = timezone('utc', now())
    WHERE id = NEW.id
      AND members.email IS DISTINCT FROM COALESCE(
        NEW.email,
        CONCAT('user+', NEW.id::text, '@placeholder.seneca.local')
      );
  END IF;
  
  RETURN NEW;
END
$$;

-- Lock down trigger function permissions
ALTER FUNCTION public.sync_member_email() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.sync_member_email() FROM PUBLIC;

-- 4) Create safety net RPC function (idempotent member ensure)
CREATE OR REPLACE FUNCTION public.ensure_member(
  p_id uuid,
  p_email text DEFAULT NULL,
  p_full_name text DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.members (
    id,
    email,
    full_name,
    created_at,
    updated_at
  )
  VALUES (
    p_id,
    COALESCE(p_email, CONCAT('user+', p_id::text, '@placeholder.seneca.local')),
    COALESCE(p_full_name, CONCAT('user_', substring(p_id::text from 1 for 8))),
    timezone('utc', now()),
    timezone('utc', now())
  )
  ON CONFLICT (id) DO UPDATE
    SET 
      email = COALESCE(EXCLUDED.email, members.email),
      full_name = COALESCE(EXCLUDED.full_name, members.full_name),
      updated_at = timezone('utc', now())
    WHERE members.email IS DISTINCT FROM EXCLUDED.email
       OR members.full_name IS DISTINCT FROM EXCLUDED.full_name;
$$;

-- Set proper ownership and permissions
ALTER FUNCTION public.ensure_member(uuid, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.ensure_member(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_member(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_member(uuid, text, text) TO service_role;

-- 5) Try to create triggers (will fail silently if no permissions)
DO $$
BEGIN
  -- Check if we have permission to create triggers on auth.users
  IF EXISTS (
    SELECT 1 FROM information_schema.table_privileges
    WHERE table_schema = 'auth' 
    AND table_name = 'users'
    AND privilege_type = 'TRIGGER'
    AND grantee = current_user
  ) THEN
    -- Drop old triggers if they exist
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
    
    -- Create new triggers
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
      
    CREATE TRIGGER on_auth_user_email_updated
      AFTER UPDATE OF email ON auth.users
      FOR EACH ROW
      WHEN (NEW.email IS DISTINCT FROM OLD.email)
      EXECUTE FUNCTION public.sync_member_email();
      
    RAISE NOTICE 'Triggers created successfully ✓';
  ELSE
    RAISE WARNING E'\n\n' ||
      '=================================================' || E'\n' ||
      '⚠️  MANUAL ACTION REQUIRED' || E'\n' ||
      '=================================================' || E'\n' ||
      'Triggers on auth.users could NOT be created automatically.' || E'\n' ||
      'Please run: supabase/migrations/20250905_create_triggers_manual.sql' || E'\n' ||
      'as role: supabase_auth_admin (via Supabase Dashboard)' || E'\n' ||
      E'\n' ||
      'To verify after manual creation, run:' || E'\n' ||
      'SELECT tgname FROM pg_trigger t' || E'\n' ||
      'JOIN pg_class c ON c.oid = t.tgrelid' || E'\n' ||
      'JOIN pg_namespace n ON n.oid = c.relnamespace' || E'\n' ||
      'WHERE n.nspname=''auth'' AND c.relname=''users'' AND NOT t.tgisinternal;' || E'\n' ||
      E'\n' ||
      'IMPORTANT: The application will still work via the ensure_member() RPC' || E'\n' ||
      'but triggers provide better reliability.' || E'\n' ||
      '=================================================';
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE WARNING E'\n\n' ||
      '=================================================' || E'\n' ||
      '⚠️  MANUAL ACTION REQUIRED' || E'\n' ||
      '=================================================' || E'\n' ||
      'Insufficient privileges to create triggers on auth.users.' || E'\n' ||
      'Please run: supabase/migrations/20250905_create_triggers_manual.sql' || E'\n' ||
      'as role: supabase_auth_admin (via Supabase Dashboard)' || E'\n' ||
      E'\n' ||
      'To verify after manual creation, run:' || E'\n' ||
      'SELECT tgname FROM pg_trigger t' || E'\n' ||
      'JOIN pg_class c ON c.oid = t.tgrelid' || E'\n' ||
      'JOIN pg_namespace n ON n.oid = c.relnamespace' || E'\n' ||
      'WHERE n.nspname=''auth'' AND c.relname=''users'' AND NOT t.tgisinternal;' || E'\n' ||
      E'\n' ||
      'IMPORTANT: The application will still work via the ensure_member() RPC' || E'\n' ||
      'but triggers provide better reliability.' || E'\n' ||
      '=================================================';
END
$$;

-- 6) Backfill orphaned auth users
DO $$
DECLARE
  orphan_count INTEGER;
  backfilled INTEGER := 0;
BEGIN
  -- Count orphans
  SELECT COUNT(*) INTO orphan_count
  FROM auth.users u
  LEFT JOIN public.members m ON m.id = u.id
  WHERE m.id IS NULL;

  IF orphan_count > 0 THEN
    RAISE NOTICE 'Found % auth users without member records. Running backfill...', orphan_count;

    INSERT INTO public.members (
      id, 
      email, 
      full_name, 
      created_at, 
      updated_at
    )
    SELECT
      u.id,
      COALESCE(
        u.email,
        CONCAT('user+', u.id::text, '@placeholder.seneca.local')
      ),
      COALESCE(
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'display_name',
        CASE 
          WHEN u.email IS NOT NULL THEN split_part(u.email, '@', 1)
          ELSE CONCAT('user_', substring(u.id::text from 1 for 8))
        END
      ),
      COALESCE(u.created_at, timezone('utc', now())),
      timezone('utc', now())
    FROM auth.users u
    LEFT JOIN public.members m ON m.id = u.id
    WHERE m.id IS NULL;

    GET DIAGNOSTICS backfilled = ROW_COUNT;
    RAISE NOTICE 'Backfilled % member records ✓', backfilled;
  ELSE
    RAISE NOTICE 'All auth users have corresponding member records ✓';
  END IF;
END$$;

-- 7) Document functions
COMMENT ON FUNCTION public.handle_new_user() IS
'Unified member creation for new auth users. Handles NULL emails from phone/OAuth providers 
with placeholder addresses. Used by trigger on auth.users INSERT.';

COMMENT ON FUNCTION public.sync_member_email() IS
'Synchronizes public.members.email when auth.users.email changes. 
Handles NULL emails with placeholder addresses. Used by trigger on auth.users UPDATE.';

COMMENT ON FUNCTION public.ensure_member(uuid, text, text) IS
'Safety net RPC to ensure a member record exists for a given auth user.
Idempotent operation that can be called from the application as a fallback.
Call with: user.id, user.email, user.user_metadata.full_name';

-- 8) Final validation and status report
DO $$
DECLARE
  func_count INTEGER;
  trigger_count INTEGER;
  orphan_count INTEGER;
  placeholder_count INTEGER;
BEGIN
  -- Check functions exist
  SELECT COUNT(*) INTO func_count
  FROM pg_proc
  WHERE proname IN ('handle_new_user', 'sync_member_email', 'ensure_member')
    AND pronamespace = 'public'::regnamespace;

  -- Check triggers exist
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'auth' 
    AND c.relname = 'users' 
    AND NOT t.tgisinternal
    AND t.tgname IN ('on_auth_user_created', 'on_auth_user_email_updated');

  -- Verify no orphans remain
  SELECT COUNT(*) INTO orphan_count
  FROM auth.users u
  LEFT JOIN public.members m ON m.id = u.id
  WHERE m.id IS NULL;

  -- Report on placeholder emails
  SELECT COUNT(*) INTO placeholder_count
  FROM public.members
  WHERE email LIKE '%@placeholder.seneca.local';

  -- Status report
  RAISE NOTICE E'\n' ||
    '=================================================' || E'\n' ||
    'MIGRATION STATUS REPORT' || E'\n' ||
    '=================================================' || E'\n' ||
    'Functions created: % of 3 expected' || E'\n' ||
    'Triggers created: % of 2 expected' || E'\n' ||
    'Orphaned users: %' || E'\n' ||
    'Placeholder emails: %' || E'\n' ||
    '=================================================' || E'\n',
    func_count, trigger_count, orphan_count, placeholder_count;

  IF trigger_count < 2 THEN
    RAISE WARNING E'⚠️  Triggers are missing. The application will work via ensure_member() RPC\n' ||
      'but you should still create triggers manually for best reliability.' || E'\n' ||
      E'\n' ||
      'Run: supabase/migrations/20250905_create_triggers_manual.sql' || E'\n' ||
      'As role: supabase_auth_admin';
  ELSE
    RAISE NOTICE '✅ All triggers are in place. System is fully configured.';
  END IF;
END$$;