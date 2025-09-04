-- Clean up all existing RLS policies before applying permissive ones
-- This prevents conflicts between old restrictive policies and new permissive ones

-- Drop all existing policies on all tables
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

-- Drop any other policies that might exist with different names
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.users;
DROP POLICY IF EXISTS "Service role can access all users" ON public.users;
DROP POLICY IF EXISTS "Users can view published videos" ON public.videos;
DROP POLICY IF EXISTS "Service role can access all videos" ON public.videos;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.video_categories;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.video_performers;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.categories;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.performers;

-- Clean slate - now ready for permissive policies
SELECT 'All existing RLS policies have been dropped. Ready for permissive policies.' as status;
