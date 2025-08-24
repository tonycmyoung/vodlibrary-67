-- Continue fixing Auth RLS Initialization Plan issues for remaining tables

-- Fix categories table RLS policies
DROP POLICY IF EXISTS "Approved users can view categories" ON public.categories;
CREATE POLICY "Approved users can view categories" ON public.categories
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (select auth.uid()) AND status = 'approved'
  )
);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories
FOR ALL USING (
  (select auth.email()) IN ('acmyau@gmail.com') OR 
  (select auth.jwt()) ->> 'role' = 'admin'
);

-- Fix user_favorites table RLS policies
DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.user_favorites;
CREATE POLICY "Users can manage their own favorites" ON public.user_favorites
FOR ALL USING ((select auth.uid()) = user_id);

-- Fix video_categories table RLS policies
DROP POLICY IF EXISTS "Approved users can view video categories" ON public.video_categories;
CREATE POLICY "Approved users can view video categories" ON public.video_categories
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (select auth.uid()) AND status = 'approved'
  )
);

DROP POLICY IF EXISTS "Admins can manage video categories" ON public.video_categories;
CREATE POLICY "Admins can manage video categories" ON public.video_categories
FOR ALL USING (
  (select auth.email()) IN ('acmyau@gmail.com') OR 
  (select auth.jwt()) ->> 'role' = 'admin'
);
