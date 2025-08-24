-- Fix the notifications INSERT policy to allow users to contact admin
-- This replaces the admin-only INSERT policy with one that allows users to send messages to admin

-- Drop the existing admin-only INSERT policy
DROP POLICY IF EXISTS "notifications_insert_admin" ON public.notifications;

-- Create new INSERT policy that allows:
-- 1. Users to send notifications to admin (identified by email 'acmyma@gmail.com')
-- 2. Admin to send notifications to any user
CREATE POLICY "notifications_insert_unified" ON public.notifications
FOR INSERT WITH CHECK (
  -- Users can send to admin
  (sender_id = (SELECT auth.uid()) AND 
   recipient_id IN (SELECT id FROM public.users WHERE email = 'acmyma@gmail.com')) OR
  -- Admin can send to anyone
  ((SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'Admin' AND
   sender_id = (SELECT auth.uid()))
);
