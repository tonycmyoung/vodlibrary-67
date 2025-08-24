-- Fix remaining multiple policies for users, video_categories, video_performers, and videos

-- Fix users table - consolidate multiple SELECT policies
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

CREATE POLICY "Users unified access policy" ON public.users
    FOR SELECT USING (
        id = (select auth.uid()) OR 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) AND role = 'Admin'
        )
    );

CREATE POLICY "Users admin management policy" ON public.users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) AND role = 'Admin'
        )
    );

-- Fix video_categories table - consolidate multiple SELECT policies
DROP POLICY IF EXISTS "Admins can manage video categories" ON public.video_categories;
DROP POLICY IF EXISTS "Approved users can view video categories" ON public.video_categories;

CREATE POLICY "Video categories unified access policy" ON public.video_categories
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND (role = 'Admin' OR status = 'approved')
        )
    );

CREATE POLICY "Video categories admin management policy" ON public.video_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) AND role = 'Admin'
        )
    );

-- Fix video_performers table - consolidate multiple SELECT policies
DROP POLICY IF EXISTS "Video performers access policy" ON public.video_performers;
DROP POLICY IF EXISTS "Video performers admin policy" ON public.video_performers;

CREATE POLICY "Video performers unified access policy" ON public.video_performers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND (role = 'Admin' OR status = 'approved')
        )
    );

CREATE POLICY "Video performers admin management policy" ON public.video_performers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) AND role = 'Admin'
        )
    );

-- Fix videos table - consolidate multiple SELECT policies
DROP POLICY IF EXISTS "Admins can manage all videos" ON public.videos;
DROP POLICY IF EXISTS "Approved users can view published videos" ON public.videos;

CREATE POLICY "Videos unified access policy" ON public.videos
    FOR SELECT USING (
        (status = 'published' AND EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) AND status = 'approved'
        )) OR 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) AND role = 'Admin'
        )
    );

CREATE POLICY "Videos admin management policy" ON public.videos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) AND role = 'Admin'
        )
    );
