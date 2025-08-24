-- Fix remaining multiple permissive policies issues
-- Consolidate multiple policies into single efficient policies

-- Fix categories table - consolidate multiple SELECT policies
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Approved users can view categories" ON public.categories;

CREATE POLICY "Categories unified access policy" ON public.categories
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND (role = 'Admin' OR status = 'approved')
        )
    );

CREATE POLICY "Categories admin management policy" ON public.categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) AND role = 'Admin'
        )
    );

-- Fix performers table - consolidate multiple SELECT policies
DROP POLICY IF EXISTS "Performers access policy" ON public.performers;
DROP POLICY IF EXISTS "Performers admin policy" ON public.performers;

CREATE POLICY "Performers unified access policy" ON public.performers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND (role = 'Admin' OR status = 'approved')
        )
    );

CREATE POLICY "Performers admin management policy" ON public.performers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) AND role = 'Admin'
        )
    );
