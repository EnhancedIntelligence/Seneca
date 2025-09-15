-- Safety net RPC function for ensuring member record exists
-- This provides an idempotent way to ensure a member record exists for any auth user
-- Can be called from the application as a fallback if triggers somehow fail

CREATE OR REPLACE FUNCTION public.ensure_member(
  p_id uuid,
  p_email text,
  p_full_name text
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
      email = EXCLUDED.email,
      updated_at = timezone('utc', now())
    WHERE public.members.email IS DISTINCT FROM EXCLUDED.email;
$$;

-- Set proper permissions
REVOKE ALL ON FUNCTION public.ensure_member(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_member(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.ensure_member(uuid, text, text) IS
'Safety net function to ensure a member record exists for a given auth user ID.
Idempotent operation that can be called from the application as a fallback.
Updates email only if it has changed. Called with: user.id, user.email, user.user_metadata.full_name';