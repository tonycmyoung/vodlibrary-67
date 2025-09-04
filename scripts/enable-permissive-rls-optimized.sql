-- Enable RLS with fully permissive policies optimized for performance
-- Uses (select auth.uid()) to avoid re-evaluation per row
-- Security is handled at the application level through proper server actions and middleware

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_performers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performers ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DROP POLICY IF EXISTS "permissive_users_policy" ON public.users;
DROP POLICY IF EXISTS "permissive_videos_policy" ON public.videos;
DROP POLICY IF EXISTS "permissive_video_categories_policy" ON public.video_categories;
DROP POLICY IF EXISTS "permissive_video_performers_policy" ON public.video_performers;
DROP POLICY IF EXISTS "permissive_user_favorites_policy" ON public.user_favorites;
DROP POLICY IF EXISTS "permissive_user_logins_policy" ON public.user_logins;
DROP POLICY IF EXISTS "permissive_notifications_policy" ON public.notifications;
DROP POLICY IF EXISTS "permissive_invitations_policy" ON public.invitations;
DROP POLICY IF EXISTS "permissive_categories_policy" ON public.categories;
DROP POLICY IF EXISTS "permissive_performers_policy" ON public.performers;

-- Create fully permissive policies with performance optimization
-- Using (select auth.uid()) prevents re-evaluation for each row

CREATE POLICY "permissive_users_policy" ON public.users
FOR ALL USING ((select auth.uid()) IS NOT NULL) WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "permissive_videos_policy" ON public.videos
FOR ALL USING ((select auth.uid()) IS NOT NULL) WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "permissive_video_categories_policy" ON public.video_categories
FOR ALL USING ((select auth.uid()) IS NOT NULL) WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "permissive_video_performers_policy" ON public.video_performers
FOR ALL USING ((select auth.uid()) IS NOT NULL) WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "permissive_user_favorites_policy" ON public.user_favorites
FOR ALL USING ((select auth.uid()) IS NOT NULL) WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "permissive_user_logins_policy" ON public.user_logins
FOR ALL USING ((select auth.uid()) IS NOT NULL) WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "permissive_notifications_policy" ON public.notifications
FOR ALL USING ((select auth.uid()) IS NOT NULL) WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "permissive_invitations_policy" ON public.invitations
FOR ALL USING ((select auth.uid()) IS NOT NULL) WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "permissive_categories_policy" ON public.categories
FOR ALL USING ((select auth.uid()) IS NOT NULL) WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "permissive_performers_policy" ON public.performers
FOR ALL USING ((select auth.uid()) IS NOT NULL) WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Grant necessary permissions to authenticated role
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.videos TO authenticated;
GRANT ALL ON public.video_categories TO authenticated;
GRANT ALL ON public.video_performers TO authenticated;
GRANT ALL ON public.user_favorites TO authenticated;
GRANT ALL ON public.user_logins TO authenticated;
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.invitations TO authenticated;
GRANT ALL ON public.categories TO authenticated;
GRANT ALL ON public.performers TO authenticated;

-- Ensure service role maintains full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
