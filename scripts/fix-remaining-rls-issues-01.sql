-- Fix remaining Auth RLS Initialization Plan issues
-- These policies still use auth.<function>() instead of (select auth.<function>())

-- Fix users table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) AND role = 'Admin'
        )
    );

DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
CREATE POLICY "Admins can manage all users" ON public.users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) AND role = 'Admin'
        )
    );

-- Fix videos table policies
DROP POLICY IF EXISTS "Approved users can view published videos" ON public.videos;
CREATE POLICY "Approved users can view published videos" ON public.videos
    FOR SELECT USING (
        status = 'published' AND 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) AND status = 'approved'
        )
    );

DROP POLICY IF EXISTS "Admins can manage all videos" ON public.videos;
CREATE POLICY "Admins can manage all videos" ON public.videos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) AND role = 'Admin'
        )
    );
