-- Complete RLS Policy Cleanup and Optimization
-- This script removes all existing policies and creates a minimal, efficient set

-- =============================================================================
-- STEP 1: Drop ALL existing RLS policies to start clean
-- =============================================================================

-- Users table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Users admin modifications" ON public.users;

-- Videos table policies  
DROP POLICY IF EXISTS "Approved users can view published videos" ON public.videos;
DROP POLICY IF EXISTS "Admins can manage all videos" ON public.videos;
DROP POLICY IF EXISTS "Videos admin modifications" ON public.videos;

-- Categories table policies
DROP POLICY IF EXISTS "Approved users can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Categories admin modifications" ON public.categories;

-- Performers table policies
DROP POLICY IF EXISTS "Performers access policy" ON public.performers;
DROP POLICY IF EXISTS "Performers admin policy" ON public.performers;
DROP POLICY IF EXISTS "Performers admin modifications" ON public.performers;

-- User favorites table policies
DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.user_favorites;

-- Video categories table policies
DROP POLICY IF EXISTS "Approved users can view video categories" ON public.video_categories;
DROP POLICY IF EXISTS "Admins can manage video categories" ON public.video_categories;
DROP POLICY IF EXISTS "Video categories admin modifications" ON public.video_categories;

-- Video performers table policies
DROP POLICY IF EXISTS "Video performers access policy" ON public.video_performers;
DROP POLICY IF EXISTS "Video performers admin policy" ON public.video_performers;
DROP POLICY IF EXISTS "Video performers admin modifications" ON public.video_performers;

-- User logins table policies
DROP POLICY IF EXISTS "Users can insert their own login records" ON public.user_logins;
DROP POLICY IF EXISTS "Admins can view all login records" ON public.user_logins;

-- Notifications table policies (if any exist)
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;

-- =============================================================================
-- STEP 2: Create optimized, minimal RLS policies
-- =============================================================================

-- Users table - Single unified policy per action
CREATE POLICY "users_select_policy" ON public.users
    FOR SELECT USING (
        (id = (SELECT auth.uid())) OR 
        ((SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'Admin')
    );

CREATE POLICY "users_update_policy" ON public.users
    FOR UPDATE USING (
        (id = (SELECT auth.uid())) OR 
        ((SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'Admin')
    );

CREATE POLICY "users_admin_policy" ON public.users
    FOR ALL USING (
        (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'Admin'
    );

-- Videos table - Single unified policy per action
CREATE POLICY "videos_select_policy" ON public.videos
    FOR SELECT USING (
        (status = 'published' AND (SELECT status FROM public.users WHERE id = (SELECT auth.uid())) = 'approved') OR
        ((SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'Admin')
    );

CREATE POLICY "videos_admin_policy" ON public.videos
    FOR ALL USING (
        (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'Admin'
    );

-- Categories table - Single unified policy per action
CREATE POLICY "categories_select_policy" ON public.categories
    FOR SELECT USING (
        ((SELECT status FROM public.users WHERE id = (SELECT auth.uid())) = 'approved') OR
        ((SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'Admin')
    );

CREATE POLICY "categories_admin_policy" ON public.categories
    FOR ALL USING (
        (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'Admin'
    );

-- Performers table - Single unified policy per action
CREATE POLICY "performers_select_policy" ON public.performers
    FOR SELECT USING (
        ((SELECT status FROM public.users WHERE id = (SELECT auth.uid())) = 'approved') OR
        ((SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'Admin')
    );

CREATE POLICY "performers_admin_policy" ON public.performers
    FOR ALL USING (
        (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'Admin'
    );

-- User favorites table - Single policy
CREATE POLICY "user_favorites_policy" ON public.user_favorites
    FOR ALL USING (
        (user_id = (SELECT auth.uid())) OR
        ((SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'Admin')
    );

-- Video categories table - Single unified policy per action
CREATE POLICY "video_categories_select_policy" ON public.video_categories
    FOR SELECT USING (
        ((SELECT status FROM public.users WHERE id = (SELECT auth.uid())) = 'approved') OR
        ((SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'Admin')
    );

CREATE POLICY "video_categories_admin_policy" ON public.video_categories
    FOR ALL USING (
        (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'Admin'
    );

-- Video performers table - Single unified policy per action
CREATE POLICY "video_performers_select_policy" ON public.video_performers
    FOR SELECT USING (
        ((SELECT status FROM public.users WHERE id = (SELECT auth.uid())) = 'approved') OR
        ((SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'Admin')
    );

CREATE POLICY "video_performers_admin_policy" ON public.video_performers
    FOR ALL USING (
        (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'Admin'
    );

-- User logins table - Single unified policy per action
CREATE POLICY "user_logins_insert_policy" ON public.user_logins
    FOR INSERT WITH CHECK (
        user_id = (SELECT auth.uid())
    );

CREATE POLICY "user_logins_select_policy" ON public.user_logins
    FOR SELECT USING (
        (user_id = (SELECT auth.uid())) OR
        ((SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'Admin')
    );

-- Notifications table (if it exists) - Single policy
CREATE POLICY "notifications_policy" ON public.notifications
    FOR ALL USING (
        (user_id = (SELECT auth.uid())) OR
        ((SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'Admin')
    );

-- =============================================================================
-- STEP 3: Ensure RLS is enabled on all tables
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_performers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check that policies were created successfully
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- Count policies per table (should be minimal now)
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
