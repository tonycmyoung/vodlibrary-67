-- Fix remaining tables and consolidate multiple permissive policies

-- Fix performers table RLS policies
DROP POLICY IF EXISTS "Allow admins to manage performers" ON public.performers;
DROP POLICY IF EXISTS "Allow authenticated users to read performers" ON public.performers;

-- Create single consolidated policy for performers
CREATE POLICY "Performers access policy" ON public.performers
FOR SELECT USING (
  -- Admins can see all
  (select auth.email()) IN ('acmyau@gmail.com') OR 
  (select auth.jwt()) ->> 'role' = 'admin' OR
  -- Approved users can read
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (select auth.uid()) AND status = 'approved'
  )
);

CREATE POLICY "Performers admin management" ON public.performers
FOR ALL USING (
  (select auth.email()) IN ('acmyau@gmail.com') OR 
  (select auth.jwt()) ->> 'role' = 'admin'
);

-- Fix video_performers table RLS policies
DROP POLICY IF EXISTS "Allow admins to manage video_performers" ON public.video_performers;
DROP POLICY IF EXISTS "Allow authenticated users to read video_performers" ON public.video_performers;

CREATE POLICY "Video performers access policy" ON public.video_performers
FOR SELECT USING (
  -- Admins can see all
  (select auth.email()) IN ('acmyau@gmail.com') OR 
  (select auth.jwt()) ->> 'role' = 'admin' OR
  -- Approved users can read
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (select auth.uid()) AND status = 'approved'
  )
);

CREATE POLICY "Video performers admin management" ON public.video_performers
FOR ALL USING (
  (select auth.email()) IN ('acmyau@gmail.com') OR 
  (select auth.jwt()) ->> 'role' = 'admin'
);

-- Fix user_logins table RLS policies
DROP POLICY IF EXISTS "Users can insert their own login records" ON public.user_logins;
CREATE POLICY "Users can insert their own login records" ON public.user_logins
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can view all login records" ON public.user_logins;
CREATE POLICY "Admins can view all login records" ON public.user_logins
FOR SELECT USING (
  (select auth.email()) IN ('acmyau@gmail.com') OR 
  (select auth.jwt()) ->> 'role' = 'admin'
);
