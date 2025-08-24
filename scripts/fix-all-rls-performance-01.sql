-- Fix Auth RLS Initialization Plan issues for users, videos, categories, and user_favorites tables
-- Replace auth.<function>() with (select auth.<function>()) for better performance

-- Users table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;

CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'Admin'
        )
    );

CREATE POLICY "Admins can manage all users" ON public.users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'Admin'
        )
    );

-- Videos table policies
DROP POLICY IF EXISTS "Approved users can view published videos" ON public.videos;
DROP POLICY IF EXISTS "Admins can manage all videos" ON public.videos;

CREATE POLICY "Approved users can view published videos" ON public.videos
    FOR SELECT USING (
        status = 'published' AND 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND status = 'approved'
        )
    );

CREATE POLICY "Admins can manage all videos" ON public.videos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'Admin'
        )
    );

-- Categories table policies
DROP POLICY IF EXISTS "Approved users can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

CREATE POLICY "Approved users can view categories" ON public.categories
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND status = 'approved'
        )
    );

CREATE POLICY "Admins can manage categories" ON public.categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'Admin'
        )
    );

-- User favorites table policies
DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.user_favorites;

CREATE POLICY "Users can manage their own favorites" ON public.user_favorites
    FOR ALL USING ((select auth.uid()) = user_id);
