-- Fix Multiple Permissive Policies issues by consolidating duplicate policies
-- Replace multiple policies with single unified policies for better performance

-- Categories table - consolidate multiple SELECT policies
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Approved users can view categories" ON public.categories;
CREATE POLICY "Categories unified access policy" ON public.categories
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = (select auth.uid()) 
    AND (u.role = 'Admin' OR u.status = 'approved')
  )
);

-- Performers table - consolidate multiple SELECT policies
DROP POLICY IF EXISTS "Performers access policy" ON public.performers;
DROP POLICY IF EXISTS "Performers admin policy" ON public.performers;
CREATE POLICY "Performers unified access policy" ON public.performers
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = (select auth.uid()) 
    AND (u.role = 'Admin' OR u.status = 'approved')
  )
);

-- Users table - consolidate multiple SELECT policies
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users unified access policy" ON public.users
FOR SELECT USING (
  id = (select auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = (select auth.uid()) AND u.role = 'Admin'
  )
);

-- Video categories table - consolidate multiple SELECT policies
DROP POLICY IF EXISTS "Admins can manage video categories" ON public.video_categories;
DROP POLICY IF EXISTS "Approved users can view video categories" ON public.video_categories;
CREATE POLICY "Video categories unified access policy" ON public.video_categories
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = (select auth.uid()) 
    AND (u.role = 'Admin' OR u.status = 'approved')
  )
);

-- Video performers table - consolidate multiple SELECT policies
DROP POLICY IF EXISTS "Video performers access policy" ON public.video_performers;
DROP POLICY IF EXISTS "Video performers admin policy" ON public.video_performers;
CREATE POLICY "Video performers unified access policy" ON public.video_performers
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = (select auth.uid()) 
    AND (u.role = 'Admin' OR u.status = 'approved')
  )
);

-- Videos table - consolidate multiple SELECT policies
DROP POLICY IF EXISTS "Admins can manage all videos" ON public.videos;
DROP POLICY IF EXISTS "Approved users can view published videos" ON public.videos;
CREATE POLICY "Videos unified access policy" ON public.videos
FOR SELECT USING (
  (status = 'published' AND EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = (select auth.uid()) AND u.status = 'approved'
  )) OR 
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = (select auth.uid()) AND u.role = 'Admin'
  )
);
