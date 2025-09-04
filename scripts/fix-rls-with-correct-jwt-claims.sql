-- Fix RLS policies to use correct JWT claim paths
-- Based on learnings from troubleshooting session

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "users_policy" ON public.users;
DROP POLICY IF EXISTS "videos_policy" ON public.videos;
DROP POLICY IF EXISTS "video_categories_policy" ON public.video_categories;
DROP POLICY IF EXISTS "video_performers_policy" ON public.video_performers;
DROP POLICY IF EXISTS "categories_policy" ON public.categories;
DROP POLICY IF EXISTS "performers_policy" ON public.performers;
DROP POLICY IF EXISTS "user_favorites_policy" ON public.user_favorites;
DROP POLICY IF EXISTS "user_logins_policy" ON public.user_logins;
DROP POLICY IF EXISTS "notifications_policy" ON public.notifications;
DROP POLICY IF EXISTS "invitations_policy" ON public.invitations;

-- Users table: Users can access their own data, Admins can access all
CREATE POLICY "users_policy" ON public.users
FOR ALL USING (
  auth.uid() = id OR 
  (auth.jwt() ->> 'app_metadata' ->> 'role') = 'Admin'
) WITH CHECK (
  auth.uid() = id OR 
  (auth.jwt() ->> 'app_metadata' ->> 'role') = 'Admin'
);

-- Videos table: Approved users can see published/approved videos, Admins can see all
CREATE POLICY "videos_policy" ON public.videos
FOR ALL USING (
  (auth.jwt() ->> 'app_metadata' ->> 'role') = 'Admin' OR
  (is_published = TRUE AND status = 'approved' AND (auth.jwt() ->> 'app_metadata' ->> 'status') = 'approved')
) WITH CHECK (
  (auth.jwt() ->> 'app_metadata' ->> 'role') = 'Admin' OR
  (is_published = TRUE AND status = 'approved' AND (auth.jwt() ->> 'app_metadata' ->> 'status') = 'approved')
);

-- Video Categories table: Same as videos
CREATE POLICY "video_categories_policy" ON public.video_categories
FOR ALL USING (
  (auth.jwt() ->> 'app_metadata' ->> 'role') = 'Admin' OR
  (auth.jwt() ->> 'app_metadata' ->> 'status') = 'approved'
) WITH CHECK (
  (auth.jwt() ->> 'app_metadata' ->> 'role') = 'Admin' OR
  (auth.jwt() ->> 'app_metadata' ->> 'status') = 'approved'
);

-- Video Performers table: Same as videos
CREATE POLICY "video_performers_policy" ON public.video_performers
FOR ALL USING (
  (auth.jwt() ->> 'app_metadata' ->> 'role') = 'Admin' OR
  (auth.jwt() ->> 'app_metadata' ->> 'status') = 'approved'
) WITH CHECK (
  (auth.jwt() ->> 'app_metadata' ->> 'role') = 'Admin' OR
  (auth.jwt() ->> 'app_metadata' ->> 'status') = 'approved'
);

-- Categories table: Approved users can read, Admins can do all
CREATE POLICY "categories_policy" ON public.categories
FOR ALL USING (
  (auth.jwt() ->> 'app_metadata' ->> 'role') = 'Admin' OR
  (auth.jwt() ->> 'app_metadata' ->> 'status') = 'approved'
) WITH CHECK (
  (auth.jwt() ->> 'app_metadata' ->> 'role') = 'Admin' OR
  (auth.jwt() ->> 'app_metadata' ->> 'status') = 'approved'
);

-- Performers table: Approved users can read, Admins can do all
CREATE POLICY "performers_policy" ON public.performers
FOR ALL USING (
  (auth.jwt() ->> 'app_metadata' ->> 'role') = 'Admin' OR
  (auth.jwt() ->> 'app_metadata' ->> 'status') = 'approved'
) WITH CHECK (
  (auth.jwt() ->> 'app_metadata' ->> 'role') = 'Admin' OR
  (auth.jwt() ->> 'app_metadata' ->> 'status') = 'approved'
);

-- User Favorites table: Users can access their own favorites, Admins can access all
CREATE POLICY "user_favorites_policy" ON public.user_favorites
FOR ALL USING (
  auth.uid() = user_id OR 
  (auth.jwt() ->> 'app_metadata' ->> 'role') = 'Admin'
) WITH CHECK (
  auth.uid() = user_id OR 
  (auth.jwt() ->> 'app_metadata' ->> 'role') = 'Admin'
);

-- User Logins table: Users can access their own logins, Admins can access all
CREATE POLICY "user_logins_policy" ON public.user_logins
FOR ALL USING (
  auth.uid() = user_id OR 
  (auth.jwt() ->> 'app_metadata' ->> 'role') = 'Admin'
) WITH CHECK (
  auth.uid() = user_id OR 
  (auth.jwt() ->> 'app_metadata' ->> 'role') = 'Admin'
);

-- Notifications table: Users can access their own notifications, Admins can access all
CREATE POLICY "notifications_policy" ON public.notifications
FOR ALL USING (
  auth.uid() = user_id OR 
  (auth.jwt() ->> 'app_metadata' ->> 'role') = 'Admin'
) WITH CHECK (
  auth.uid() = user_id OR 
  (auth.jwt() ->> 'app_metadata' ->> 'role') = 'Admin'
);

-- Invitations table: Admins can manage invitations
CREATE POLICY "invitations_policy" ON public.invitations
FOR ALL USING (
  (auth.jwt() ->> 'app_metadata' ->> 'role') = 'Admin'
) WITH CHECK (
  (auth.jwt() ->> 'app_metadata' ->> 'role') = 'Admin'
);

-- Ensure RLS is enabled on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_performers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
