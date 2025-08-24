-- Fix Multiple Permissive Policies for notifications, performers, users, video_performers, and videos tables

-- Notifications table - consolidate multiple policies
DROP POLICY IF EXISTS "Admin can send notifications to users" ON public.notifications;
DROP POLICY IF EXISTS "Users can send notifications to admin" ON public.notifications;
DROP POLICY IF EXISTS "Admin can read all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can read their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admin can update all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

-- Consolidated notifications policies
CREATE POLICY "Notifications insert policy" ON public.notifications
    FOR INSERT WITH CHECK (
        -- Admins can send to anyone
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'Admin'
        )
        OR
        -- Users can send to admin (sender_id must be their own ID)
        ((select auth.uid()) = sender_id)
    );

CREATE POLICY "Notifications select policy" ON public.notifications
    FOR SELECT USING (
        -- Admins can read all notifications
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'Admin'
        )
        OR
        -- Users can read notifications they sent or received
        ((select auth.uid()) = sender_id OR (select auth.uid()) = recipient_id)
    );

CREATE POLICY "Notifications update policy" ON public.notifications
    FOR UPDATE USING (
        -- Admins can update all notifications
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'Admin'
        )
        OR
        -- Users can update notifications they received (for read status)
        ((select auth.uid()) = recipient_id)
    );

-- Performers table - consolidate policies
DROP POLICY IF EXISTS "Allow admins to manage performers" ON public.performers;
DROP POLICY IF EXISTS "Allow authenticated users to read performers" ON public.performers;

CREATE POLICY "Performers access policy" ON public.performers
    FOR SELECT USING (
        -- Admins can see all performers
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'Admin'
        )
        OR
        -- Authenticated users can read performers
        ((select auth.uid()) IS NOT NULL)
    );

CREATE POLICY "Performers admin policy" ON public.performers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'Admin'
        )
    );

-- Video performers table - consolidate policies
DROP POLICY IF EXISTS "Allow admins to manage video_performers" ON public.video_performers;
DROP POLICY IF EXISTS "Allow authenticated users to read video_performers" ON public.video_performers;

CREATE POLICY "Video performers access policy" ON public.video_performers
    FOR SELECT USING (
        -- Admins can see all video performers
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'Admin'
        )
        OR
        -- Authenticated users can read video performers
        ((select auth.uid()) IS NOT NULL)
    );

CREATE POLICY "Video performers admin policy" ON public.video_performers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'Admin'
        )
    );
