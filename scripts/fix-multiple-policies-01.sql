-- Fix Multiple Permissive Policies issues by consolidating redundant policies
-- Categories table - consolidate admin and user policies

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Approved users can view categories" ON public.categories;

-- Single consolidated policy for categories SELECT
CREATE POLICY "Categories access policy" ON public.categories
    FOR SELECT USING (
        -- Admins can see all categories
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'Admin'
        )
        OR
        -- Approved users can see categories
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND status = 'approved'
        )
    );

-- Admin-only policy for categories modifications
CREATE POLICY "Categories admin policy" ON public.categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'Admin'
        )
    );

-- Video categories table - consolidate policies
DROP POLICY IF EXISTS "Admins can manage video categories" ON public.video_categories;
DROP POLICY IF EXISTS "Approved users can view video categories" ON public.video_categories;

CREATE POLICY "Video categories access policy" ON public.video_categories
    FOR SELECT USING (
        -- Admins can see all video categories
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'Admin'
        )
        OR
        -- Approved users can see video categories
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND status = 'approved'
        )
    );

CREATE POLICY "Video categories admin policy" ON public.video_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'Admin'
        )
    );
