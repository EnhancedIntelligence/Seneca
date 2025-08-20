-- RLS Policies for User-Scoped Access
-- These policies ensure users can only access data they're authorized to see

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "read own memberships" ON public.family_memberships;
DROP POLICY IF EXISTS "read families via membership" ON public.families;

-- Policy: Users can read their own family memberships
CREATE POLICY "read own memberships"
ON public.family_memberships
FOR SELECT
USING (user_id = auth.uid());

-- Policy: Users can read families they are members of
CREATE POLICY "read families via membership"
ON public.families
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.family_memberships fm
    WHERE fm.family_id = families.id 
    AND fm.user_id = auth.uid()
  )
);

-- Policy: Users can insert families (become the creator)
CREATE POLICY IF NOT EXISTS "create families"
ON public.families
FOR INSERT
WITH CHECK (created_by = auth.uid());

-- Policy: Users can insert themselves as family members
CREATE POLICY IF NOT EXISTS "create own memberships"
ON public.family_memberships
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policy: Admin members can update family details
CREATE POLICY IF NOT EXISTS "update families as admin"
ON public.families
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM public.family_memberships fm
    WHERE fm.family_id = families.id 
    AND fm.user_id = auth.uid()
    AND fm.role = 'admin'
  )
);

-- Policy: Admin members can update memberships
CREATE POLICY IF NOT EXISTS "update memberships as admin"
ON public.family_memberships
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM public.family_memberships fm
    WHERE fm.family_id = family_memberships.family_id
    AND fm.user_id = auth.uid()
    AND fm.role = 'admin'
  )
);

-- Ensure RLS is enabled on the tables
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_memberships ENABLE ROW LEVEL SECURITY;

-- Comments for documentation
COMMENT ON POLICY "read own memberships" ON public.family_memberships 
IS 'Users can read their own family membership records';

COMMENT ON POLICY "read families via membership" ON public.families 
IS 'Users can read families they are members of';

COMMENT ON POLICY "create families" ON public.families 
IS 'Users can create new families and become the creator';

COMMENT ON POLICY "create own memberships" ON public.family_memberships 
IS 'Users can add themselves as family members';

COMMENT ON POLICY "update families as admin" ON public.families 
IS 'Admin members can update family details';

COMMENT ON POLICY "update memberships as admin" ON public.family_memberships 
IS 'Admin members can manage family memberships';