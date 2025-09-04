-- Remove RLS entirely from all tables
-- This script disables RLS and drops all policies to rely on application-level authorization

-- Drop all existing RLS policies
DROP POLICY IF EXISTS "categories_policy" ON public.categories;
DROP POLICY IF EXISTS "invitations_policy" ON public.invitations;
DROP POLICY IF EXISTS "notifications_policy" ON public.notifications;
DROP POLICY IF EXISTS "performers_policy" ON public.performers;
DROP POLICY IF EXISTS "user_favorites_policy" ON public.user_favorites;
DROP POLICY IF EXISTS "user_logins_policy" ON public.user_logins;
DROP POLICY IF EXISTS "users_policy" ON public.users;
DROP POLICY IF EXISTS "video_categories_policy" ON public.video_categories;
DROP POLICY IF EXISTS "video_performers_policy" ON public.video_performers;
DROP POLICY IF EXISTS "videos_policy" ON public.videos;

-- Drop any other policies that might exist with different names
DROP POLICY IF EXISTS "Service role can access all categories" ON public.categories;
DROP POLICY IF EXISTS "Service role can access all invitations" ON public.invitations;
DROP POLICY IF EXISTS "Service role can access all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can access all performers" ON public.performers;
DROP POLICY IF EXISTS "Service role can access all user_favorites" ON public.user_favorites;
DROP POLICY IF EXISTS "Service role can access all user_logins" ON public.user_logins;
DROP POLICY IF EXISTS "Service role can access all users" ON public.users;
DROP POLICY IF EXISTS "Service role can access all video_categories" ON public.video_categories;
DROP POLICY IF EXISTS "Service role can access all video_performers" ON public.video_performers;
DROP POLICY IF EXISTS "Service role can access all videos" ON public.videos;

-- Drop admin policies
DROP POLICY IF EXISTS "Admin can access all categories" ON public.categories;
DROP POLICY IF EXISTS "Admin can access all invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admin can access all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admin can access all performers" ON public.performers;
DROP POLICY IF EXISTS "Admin can access all user_favorites" ON public.user_favorites;
DROP POLICY IF EXISTS "Admin can access all user_logins" ON public.user_logins;
DROP POLICY IF EXISTS "Admin can access all users" ON public.users;
DROP POLICY IF EXISTS "Admin can access all video_categories" ON public.video_categories;
DROP POLICY IF EXISTS "Admin can access all video_performers" ON public.video_performers;
DROP POLICY IF EXISTS "Admin can access all videos" ON public.videos;

-- Drop user-specific policies
DROP POLICY IF EXISTS "Users can access their own data" ON public.users;
DROP POLICY IF EXISTS "Users can access their own favorites" ON public.user_favorites;
DROP POLICY IF EXISTS "Users can access their own notifications" ON public.notifications;

-- Disable RLS on all tables
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.performers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_logins DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_performers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos DISABLE ROW LEVEL SECURITY;

-- Grant full access to authenticated users (anon key) for all tables
-- This allows the middleware and client-side queries to work without restrictions
GRANT ALL ON public.categories TO authenticated;
GRANT ALL ON public.invitations TO authenticated;
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.performers TO authenticated;
GRANT ALL ON public.user_favorites TO authenticated;
GRANT ALL ON public.user_logins TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.video_categories TO authenticated;
GRANT ALL ON public.video_performers TO authenticated;
GRANT ALL ON public.videos TO authenticated;

-- Grant usage on sequences if they exist
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Ensure service role maintains full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Clean up any remaining RLS-related functions if they exist
DROP FUNCTION IF EXISTS custom_access_token_hook(jsonb);

COMMENT ON SCHEMA public IS 'RLS disabled - relying on application-level authorization';
