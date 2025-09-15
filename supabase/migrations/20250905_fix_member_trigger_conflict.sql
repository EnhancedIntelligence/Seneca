-- Fix conflicting member auto-creation triggers
-- This migration consolidates two competing triggers into one authoritative solution
-- and adds email synchronization to keep auth.users and public.members aligned
--
-- IMPORTANT: members.email is NOT NULL, so we handle NULL emails from auth providers
-- that don't require email (phone auth, certain OAuth configurations)

-- 1) Drop existing triggers FIRST (before dropping functions they depend on)
-- auth.users is owned by supabase_auth_admin, so we need role switching
BEGIN;
SET LOCAL ROLE supabase_auth_admin;

-- Drop old triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created__members ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;

RESET ROLE;
COMMIT;

-- 2) NOW we can safely drop old functions (triggers no longer depend on them)
DROP FUNCTION IF EXISTS public.handle_new_user_members();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3) Create unified insert function with NULL email handling
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
    -- Use a clearly marked placeholder that won't conflict with real emails
    COALESCE(
      NEW.email,
      CONCAT('user+', NEW.id::text, '@placeholder.seneca.local')
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'display_name',
      -- For NULL email, can't use email prefix as name
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

-- Ensure explicit ownership and ACLs
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- 4) Create triggers on auth.users (requires role switching)
-- The auth.users table is owned by supabase_auth_admin, not postgres
-- We use SET LOCAL ROLE within a transaction so it auto-resets at COMMIT

BEGIN; -- Start transaction for role switching

-- Switch to the owner of auth.users for trigger DDL
SET LOCAL ROLE supabase_auth_admin;

-- Create single authoritative trigger for inserts
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Role automatically resets at COMMIT
COMMIT;

-- 4b) Keep emails in sync after updates
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
        -- If email becomes NULL (rare but possible), use placeholder
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

ALTER FUNCTION public.sync_member_email() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.sync_member_email() FROM PUBLIC;

-- 5) Create email sync trigger (also requires role switching)
BEGIN; -- Start transaction for role switching

SET LOCAL ROLE supabase_auth_admin;

-- Create email sync trigger
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (NEW.email IS DISTINCT FROM OLD.email)
  EXECUTE FUNCTION public.sync_member_email();

-- Role automatically resets at COMMIT
COMMIT;

-- 6) Backfill orphaned auth users (idempotent with UTC timestamps and NULL email handling)
DO $$
DECLARE
  orphan_count INTEGER;
  null_email_count INTEGER;
BEGIN
  -- Count orphans
  SELECT COUNT(*) INTO orphan_count
  FROM auth.users u
  LEFT JOIN public.members m ON m.id = u.id
  WHERE m.id IS NULL;

  -- Count auth users with NULL emails (for awareness)
  SELECT COUNT(*) INTO null_email_count
  FROM auth.users
  WHERE email IS NULL;

  IF null_email_count > 0 THEN
    RAISE NOTICE 'Found % auth users with NULL emails (will use placeholder addresses)', null_email_count;
  END IF;

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

    RAISE NOTICE 'Backfill complete.';
  ELSE
    RAISE NOTICE 'All auth users have corresponding member records. ✓';
  END IF;
END$$;

-- 7) Document function purposes
COMMENT ON FUNCTION public.handle_new_user() IS
'Unified member creation for new auth users. Handles NULL emails from phone/OAuth providers 
with placeholder addresses. Omits subscription fields to rely on table defaults.';

COMMENT ON FUNCTION public.sync_member_email() IS
'Synchronizes public.members.email when auth.users.email changes. 
Handles NULL emails with placeholder addresses since members.email is NOT NULL.';

-- Comments on triggers require role switching
BEGIN;
SET LOCAL ROLE supabase_auth_admin;

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS
'Creates corresponding member record for new auth users';

COMMENT ON TRIGGER on_auth_user_email_updated ON auth.users IS
'Keeps member email in sync with auth user email changes';

RESET ROLE;
COMMIT;

-- 8) Post-migration validation
DO $$
DECLARE
  trigger_count INTEGER;
  orphan_count INTEGER;
  placeholder_count INTEGER;
BEGIN
  -- Check we have exactly the triggers we expect
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'auth' 
    AND c.relname = 'users' 
    AND NOT t.tgisinternal
    AND t.tgname IN ('on_auth_user_created', 'on_auth_user_email_updated');
  
  IF trigger_count != 2 THEN
    RAISE WARNING 'Expected 2 triggers on auth.users, found %', trigger_count;
  ELSE
    RAISE NOTICE 'Triggers configured correctly: % triggers found', trigger_count;
  END IF;

  -- Verify no orphans remain
  SELECT COUNT(*) INTO orphan_count
  FROM auth.users u
  LEFT JOIN public.members m ON m.id = u.id
  WHERE m.id IS NULL;

  IF orphan_count > 0 THEN
    RAISE WARNING 'Still have % orphaned auth users without member records', orphan_count;
  ELSE
    RAISE NOTICE 'No orphaned users: all auth users have member records ✓';
  END IF;

  -- Report on placeholder emails (informational)
  SELECT COUNT(*) INTO placeholder_count
  FROM public.members
  WHERE email LIKE '%@placeholder.seneca.local';
  
  IF placeholder_count > 0 THEN
    RAISE NOTICE 'Info: % member records use placeholder emails (from NULL auth emails)', placeholder_count;
  END IF;
  
  RAISE NOTICE 'Migration complete successfully.';
END$$;