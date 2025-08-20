-- Enable Row Level Security on all user data tables
-- This ensures all tables have RLS enabled for security

-- Core tables
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_entries ENABLE ROW LEVEL SECURITY;

-- Supporting tables (if they exist)
DO $$ 
BEGIN
    -- Enable RLS on memory_media if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'memory_media') THEN
        ALTER TABLE public.memory_media ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Enable RLS on memory_tags if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'memory_tags') THEN
        ALTER TABLE public.memory_tags ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Enable RLS on milestones if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'milestones') THEN
        ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Enable RLS on insights if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'insights') THEN
        ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Verify RLS is enabled (for documentation)
COMMENT ON SCHEMA public IS 'Row Level Security enabled on all user data tables for security';