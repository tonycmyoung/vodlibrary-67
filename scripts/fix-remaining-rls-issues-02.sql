-- Fix remaining categories and video_categories policies

-- Fix categories table policies
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
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) AND role = 'Admin'
        )
    );

-- Fix video_categories table policies
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
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) AND role = 'Admin'
        )
    );

-- Fix user_favorites table policy
DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.user_favorites;
CREATE POLICY "Users can manage their own favorites" ON public.user_favorites
    FOR ALL USING (user_id = (select auth.uid()));

-- Fix user_logins table policies
DROP POLICY IF EXISTS "Users can insert their own login records" ON public.user_logins;
CREATE POLICY "Users can insert their own login records" ON public.user_logins
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all login records" ON public.user_logins;
CREATE POLICY "Admins can view all login records" ON public.user_logins
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) AND role = 'Admin'
        )
    );
