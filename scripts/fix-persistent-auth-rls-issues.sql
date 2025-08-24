-- Fix Auth RLS Initialization Plan issues by optimizing auth function calls
-- Replace auth.<function>() with (select auth.<function>()) for better performance

-- Users table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
FOR SELECT USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = (select auth.uid()) AND u.role = 'Admin'
  )
);

DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
CREATE POLICY "Admins can manage all users" ON public.users
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = (select auth.uid()) AND u.role = 'Admin'
  )
);

-- Videos table policies
DROP POLICY IF EXISTS "Approved users can view published videos" ON public.videos;
CREATE POLICY "Approved users can view published videos" ON public.videos
FOR SELECT USING (
  status = 'published' AND 
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = (select auth.uid()) AND u.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Admins can manage all videos" ON public.videos;
CREATE POLICY "Admins can manage all videos" ON public.videos
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = (select auth.uid()) AND u.role = 'Admin'
  )
);

-- Categories table policies
DROP POLICY IF EXISTS "Approved users can view categories" ON public.categories;
CREATE POLICY "Approved users can view categories" ON public.categories
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = (select auth.uid()) AND u.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = (select auth.uid()) AND u.role = 'Admin'
  )
);

-- User favorites table policies
DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.user_favorites;
CREATE POLICY "Users can manage their own favorites" ON public.user_favorites
FOR ALL USING (user_id = (select auth.uid()));

-- Video categories table policies
DROP POLICY IF EXISTS "Approved users can view video categories" ON public.video_categories;
CREATE POLICY "Approved users can view video categories" ON public.video_categories
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = (select auth.uid()) AND u.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Admins can manage video categories" ON public.video_categories;
CREATE POLICY "Admins can manage video categories" ON public.video_categories
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = (select auth.uid()) AND u.role = 'Admin'
  )
);

-- User logins table policies
DROP POLICY IF EXISTS "Users can insert their own login records" ON public.user_logins;
CREATE POLICY "Users can insert their own login records" ON public.user_logins
FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all login records" ON public.user_logins;
CREATE POLICY "Admins can view all login records" ON public.user_logins
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = (select auth.uid()) AND u.role = 'Admin'
  )
);
