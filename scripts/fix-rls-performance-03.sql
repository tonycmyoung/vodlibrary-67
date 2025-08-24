-- Fix remaining Auth RLS Initialization Plan issues

-- Fix notifications table RLS policies
DROP POLICY IF EXISTS "Users can read their own notifications" ON public.notifications;
CREATE POLICY "Users can read their own notifications" ON public.notifications
FOR SELECT USING ((select auth.uid()) = recipient_id);

DROP POLICY IF EXISTS "Users can send notifications to admin" ON public.notifications;
CREATE POLICY "Users can send notifications to admin" ON public.notifications
FOR INSERT WITH CHECK ((select auth.uid()) = sender_id);

DROP POLICY IF EXISTS "Admin can read all notifications" ON public.notifications;
CREATE POLICY "Admin can read all notifications" ON public.notifications
FOR SELECT USING (
  (select auth.email()) IN ('acmyau@gmail.com') OR 
  (select auth.jwt()) ->> 'role' = 'admin'
);

DROP POLICY IF EXISTS "Admin can send notifications to users" ON public.notifications;
CREATE POLICY "Admin can send notifications to users" ON public.notifications
FOR INSERT WITH CHECK (
  (select auth.email()) IN ('acmyau@gmail.com') OR 
  (select auth.jwt()) ->> 'role' = 'admin'
);

DROP POLICY IF EXISTS "Admin can update all notifications" ON public.notifications;
CREATE POLICY "Admin can update all notifications" ON public.notifications
FOR UPDATE USING (
  (select auth.email()) IN ('acmyau@gmail.com') OR 
  (select auth.jwt()) ->> 'role' = 'admin'
);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE USING ((select auth.uid()) = recipient_id);
