-- Final RLS Cleanup and Optimization
-- This script removes ALL existing policies and creates a minimal, efficient set

-- Disable RLS temporarily to clean up
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.performers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_performers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_logins DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Users admin modifications" ON public.users;

DROP POLICY IF EXISTS "Approved users can view published videos" ON public.videos;
DROP POLICY IF EXISTS "Admins can manage all videos" ON public.videos;
DROP POLICY IF EXISTS "Videos admin modifications" ON public.videos;

DROP POLICY IF EXISTS "Approved users can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Categories admin modifications" ON public.categories;

DROP POLICY IF EXISTS "Performers access policy" ON public.performers;
DROP POLICY IF EXISTS "Performers admin policy" ON public.performers;
DROP POLICY IF EXISTS "Performers admin modifications" ON public.performers;

DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.user_favorites;

DROP POLICY IF EXISTS "Approved users can view video categories" ON public.video_categories;
DROP POLICY IF EXISTS "Admins can manage video categories" ON public.video_categories;
DROP POLICY IF EXISTS "Video categories admin modifications" ON public.video_categories;

DROP POLICY IF EXISTS "Video performers access policy" ON public.video_performers;
DROP POLICY IF EXISTS "Video performers admin policy" ON public.video_performers;
DROP POLICY IF EXISTS "Video performers admin modifications" ON public.video_performers;

DROP POLICY IF EXISTS "Users can insert their own login records" ON public.user_logins;
DROP POLICY IF EXISTS "Admins can view all login records" ON public.user_logins;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_performers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create optimized, minimal policies using (SELECT auth.<function>()) syntax

-- Users table - single unified policy
CREATE POLICY "users_access_policy" ON public.users
FOR ALL USING (
  (SELECT auth.uid()) = id OR 
  (SELECT auth.jwt() ->> 'role') = 'Admin'
);

-- Videos table - single unified policy
CREATE POLICY "videos_access_policy" ON public.videos
FOR ALL USING (
  (status = 'published' AND (SELECT auth.jwt() ->> 'status') = 'approved') OR
  (SELECT auth.jwt() ->> 'role') = 'Admin'
);

-- Categories table - single unified policy
CREATE POLICY "categories_access_policy" ON public.categories
FOR ALL USING (
  (SELECT auth.jwt() ->> 'status') = 'approved' OR
  (SELECT auth.jwt() ->> 'role') = 'Admin'
);

-- Performers table - single unified policy
CREATE POLICY "performers_access_policy" ON public.performers
FOR ALL USING (
  (SELECT auth.jwt() ->> 'status') = 'approved' OR
  (SELECT auth.jwt() ->> 'role') = 'Admin'
);

-- User favorites - single unified policy
CREATE POLICY "user_favorites_access_policy" ON public.user_favorites
FOR ALL USING (
  (SELECT auth.uid()) = user_id OR
  (SELECT auth.jwt() ->> 'role') = 'Admin'
);

-- Video categories - single unified policy
CREATE POLICY "video_categories_access_policy" ON public.video_categories
FOR ALL USING (
  (SELECT auth.jwt() ->> 'status') = 'approved' OR
  (SELECT auth.jwt() ->> 'role') = 'Admin'
);

-- Video performers - single unified policy
CREATE POLICY "video_performers_access_policy" ON public.video_performers
FOR ALL USING (
  (SELECT auth.jwt() ->> 'status') = 'approved' OR
  (SELECT auth.jwt() ->> 'role') = 'Admin'
);

-- User logins - single unified policy
CREATE POLICY "user_logins_access_policy" ON public.user_logins
FOR ALL USING (
  (SELECT auth.uid()) = user_id OR
  (SELECT auth.jwt() ->> 'role') = 'Admin'
);
