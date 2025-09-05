-- Manual trigger creation script for auth.users
-- Run this script as role: supabase_auth_admin in Supabase Dashboard
-- 
-- To run with correct role in Supabase Dashboard:
-- 1. Go to SQL Editor
-- 2. Select "supabase_auth_admin" from the Role dropdown
-- 3. Run this script
--
-- If role dropdown is not available, you may need to contact Supabase support

-- First, verify required functions exist
DO $$
DECLARE
  has_create boolean;
  has_update boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'handle_new_user'
      AND pronamespace = 'public'::regnamespace
  ) INTO has_create;

  SELECT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'sync_member_email'
      AND pronamespace = 'public'::regnamespace
  ) INTO has_update;

  IF NOT has_create OR NOT has_update THEN
    RAISE EXCEPTION E'Missing required functions:\n' ||
      '  handle_new_user: %\n' ||
      '  sync_member_email: %',
      has_create, has_update
      USING HINT = 'Run the no-role migration (20250905_fix_member_trigger_conflict_no_role.sql) first to create these functions, then re-run this manual trigger script.';
  END IF;
  
  RAISE NOTICE 'Required functions verified ✓';
END$$;

-- Wrap all DDL in a transaction for atomicity
BEGIN;

-- Drop old triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created__members ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;

-- Create insert trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create update trigger for email changes
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (NEW.email IS DISTINCT FROM OLD.email)
  EXECUTE FUNCTION public.sync_member_email();

-- Add comments to triggers
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS
'Creates corresponding member record for new auth users';

COMMENT ON TRIGGER on_auth_user_email_updated ON auth.users IS
'Keeps member email in sync with auth user email changes';

COMMIT;

-- Verify triggers were created
DO $$
DECLARE
  trigger_count INTEGER;
  missing_triggers TEXT := '';
  has_insert BOOLEAN;
  has_update BOOLEAN;
BEGIN
  -- Count triggers
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'auth' 
    AND c.relname = 'users' 
    AND NOT t.tgisinternal
    AND t.tgname IN ('on_auth_user_created', 'on_auth_user_email_updated');

  -- Check which specific triggers exist
  SELECT EXISTS(
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth' AND c.relname = 'users'
      AND t.tgname = 'on_auth_user_created'
  ) INTO has_insert;

  SELECT EXISTS(
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth' AND c.relname = 'users'
      AND t.tgname = 'on_auth_user_email_updated'
  ) INTO has_update;

  IF trigger_count = 2 THEN
    RAISE NOTICE E'\n' ||
      '=================================================' || E'\n' ||
      '✅ SUCCESS: Triggers created successfully!' || E'\n' ||
      '=================================================' || E'\n' ||
      'Both triggers are now active:' || E'\n' ||
      '  ✓ on_auth_user_created (INSERT)' || E'\n' ||
      '  ✓ on_auth_user_email_updated (UPDATE)' || E'\n' ||
      E'\n' ||
      'The system is now fully configured.' || E'\n' ||
      '=================================================';
  ELSE
    -- Build list of missing triggers
    IF NOT has_insert THEN
      missing_triggers := missing_triggers || E'\n  ✗ on_auth_user_created';
    END IF;
    IF NOT has_update THEN
      missing_triggers := missing_triggers || E'\n  ✗ on_auth_user_email_updated';
    END IF;

    RAISE WARNING E'\n' ||
      '=================================================' || E'\n' ||
      '⚠️  WARNING: Expected 2 triggers, found %' || E'\n' ||
      '=================================================' || E'\n' ||
      'Missing triggers:' || missing_triggers || E'\n' ||
      E'\n' ||
      'Please check for errors above.' || E'\n' ||
      '=================================================', trigger_count;
  END IF;
END$$;

-- Show all triggers on auth.users for confirmation
SELECT 
  t.tgname AS trigger_name,
  CASE t.tgtype::integer & 66
    WHEN 2 THEN 'BEFORE'
    WHEN 66 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END AS trigger_timing,
  CASE 
    WHEN t.tgtype::integer & 4 = 4 THEN 'INSERT'
    WHEN t.tgtype::integer & 8 = 8 THEN 'DELETE'
    WHEN t.tgtype::integer & 16 = 16 THEN 'UPDATE'
  END AS trigger_event,
  p.proname AS function_name,
  n.nspname || '.' || c.relname AS table_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE n.nspname = 'auth' 
  AND c.relname = 'users'
  AND NOT t.tgisinternal
ORDER BY t.tgname;

-- Final check: Verify no orphaned users remain
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM auth.users u
  LEFT JOIN public.members m ON m.id = u.id
  WHERE m.id IS NULL;

  IF orphan_count > 0 THEN
    RAISE NOTICE E'\n⚠️  Found % orphaned auth users. Run the backfill in the main migration.', orphan_count;
  ELSE
    RAISE NOTICE E'\n✅ All auth users have corresponding member records.';
  END IF;
END$$;