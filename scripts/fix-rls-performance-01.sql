-- Fix Auth RLS Initialization Plan issues by optimizing auth function calls
-- This addresses the performance warnings where auth.<function>() calls are re-evaluated for each row

-- Fix users table RLS policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
FOR SELECT USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users
FOR SELECT USING (
  (select auth.email()) IN ('acmyau@gmail.com') OR 
  (select auth.jwt()) ->> 'role' = 'admin'
);

DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
CREATE POLICY "Admins can manage all users" ON public.users
FOR ALL USING (
  (select auth.email()) IN ('acmyau@gmail.com') OR 
  (select auth.jwt()) ->> 'role' = 'admin'
);

-- Fix videos table RLS policies
DROP POLICY IF EXISTS "Approved users can view published videos" ON public.videos;
CREATE POLICY "Approved users can view published videos" ON public.videos
FOR SELECT USING (
  status = 'published' AND 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (select auth.uid()) AND status = 'approved'
  )
);

DROP POLICY IF EXISTS "Admins can manage all videos" ON public.videos;
CREATE POLICY "Admins can manage all videos" ON public.videos
FOR ALL USING (
  (select auth.email()) IN ('acmyau@gmail.com') OR 
  (select auth.jwt()) ->> 'role' = 'admin'
);
