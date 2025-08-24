-- Add back admin modification policies that were consolidated
-- Admins need separate policies for INSERT, UPDATE, DELETE operations

-- Categories - admin modifications
CREATE POLICY "Categories admin modifications" ON public.categories
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = (select auth.uid()) AND u.role = 'Admin'
  )
);

-- Videos - admin modifications
CREATE POLICY "Videos admin modifications" ON public.videos
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = (select auth.uid()) AND u.role = 'Admin'
  )
);

-- Users - admin modifications
CREATE POLICY "Users admin modifications" ON public.users
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = (select auth.uid()) AND u.role = 'Admin'
  )
);

-- Video categories - admin modifications
CREATE POLICY "Video categories admin modifications" ON public.video_categories
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = (select auth.uid()) AND u.role = 'Admin'
  )
);

-- Video performers - admin modifications
CREATE POLICY "Video performers admin modifications" ON public.video_performers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = (select auth.uid()) AND u.role = 'Admin'
  )
);

-- Performers - admin modifications
CREATE POLICY "Performers admin modifications" ON public.performers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = (select auth.uid()) AND u.role = 'Admin'
  )
);
