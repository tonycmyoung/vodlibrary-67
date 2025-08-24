-- Fix Auth RLS Initialization Plan issues for video_categories, performers, video_performers, and user_logins tables

-- Video categories table policies
DROP POLICY IF EXISTS "Approved users can view video categories" ON public.video_categories;
DROP POLICY IF EXISTS "Admins can manage video categories" ON public.video_categories;

CREATE POLICY "Approved users can view video categories" ON public.video_categories
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND status = 'approved'
        )
    );

CREATE POLICY "Admins can manage video categories" ON public.video_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'Admin'
        )
    );

-- Performers table policies
DROP POLICY IF EXISTS "Allow admins to manage performers" ON public.performers;
DROP POLICY IF EXISTS "Allow authenticated users to read performers" ON public.performers;

CREATE POLICY "Allow admins to manage performers" ON public.performers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'Admin'
        )
    );

CREATE POLICY "Allow authenticated users to read performers" ON public.performers
    FOR SELECT USING ((select auth.uid()) IS NOT NULL);

-- Video performers table policies
DROP POLICY IF EXISTS "Allow admins to manage video_performers" ON public.video_performers;
DROP POLICY IF EXISTS "Allow authenticated users to read video_performers" ON public.video_performers;

CREATE POLICY "Allow admins to manage video_performers" ON public.video_performers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'Admin'
        )
    );

CREATE POLICY "Allow authenticated users to read video_performers" ON public.video_performers
    FOR SELECT USING ((select auth.uid()) IS NOT NULL);

-- User logins table policies
DROP POLICY IF EXISTS "Users can insert their own login records" ON public.user_logins;
DROP POLICY IF EXISTS "Admins can view all login records" ON public.user_logins;

CREATE POLICY "Users can insert their own login records" ON public.user_logins
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Admins can view all login records" ON public.user_logins
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'Admin'
        )
    );
