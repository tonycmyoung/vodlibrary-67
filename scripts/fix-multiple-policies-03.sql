-- Fix Multiple Permissive Policies for users and videos tables (final cleanup)

-- Users table - consolidate multiple policies
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- Consolidated users policies
CREATE POLICY "Users select policy" ON public.users
    FOR SELECT USING (
        -- Admins can see all users
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'Admin'
        )
        OR
        -- Users can see their own profile
        ((select auth.uid()) = id)
    );

CREATE POLICY "Users admin policy" ON public.users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'Admin'
        )
    );

-- Videos table - consolidate multiple policies
DROP POLICY IF EXISTS "Admins can manage all videos" ON public.videos;
DROP POLICY IF EXISTS "Approved users can view published videos" ON public.videos;

-- Consolidated videos policies
CREATE POLICY "Videos select policy" ON public.videos
    FOR SELECT USING (
        -- Admins can see all videos
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'Admin'
        )
        OR
        -- Approved users can see published videos
        (
            status = 'published' AND 
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE id = (select auth.uid()) 
                AND status = 'approved'
            )
        )
    );

CREATE POLICY "Videos admin policy" ON public.videos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'Admin'
        )
    );

-- Final cleanup: Ensure RLS is enabled on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_performers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
