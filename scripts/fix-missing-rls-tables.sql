-- Fix RLS for categories and performers tables specifically
-- These may have failed in the previous script execution

-- Enable RLS on the missing tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performers ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DROP POLICY IF EXISTS "permissive_categories_policy" ON public.categories;
DROP POLICY IF EXISTS "permissive_performers_policy" ON public.performers;

-- Create fully permissive policies
CREATE POLICY "permissive_categories_policy" ON public.categories
FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "permissive_performers_policy" ON public.performers
FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Grant necessary permissions
GRANT ALL ON public.categories TO authenticated;
GRANT ALL ON public.performers TO authenticated;
GRANT ALL ON public.categories TO service_role;
GRANT ALL ON public.performers TO service_role;
