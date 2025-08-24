-- Fix RLS policies that still use old JWT app_metadata approach
-- These should use the new authorize() function or JWT user_role claim

-- Update notifications policies to use authorize() function
DROP POLICY IF EXISTS "notifications_delete_user_and_admin" ON public.notifications;
CREATE POLICY "notifications_delete_user_and_admin" ON public.notifications
FOR DELETE USING (
  (recipient_id = auth.uid()) OR 
  (SELECT authorize('notifications.delete'))
);

DROP POLICY IF EXISTS "notifications_update_user_and_admin" ON public.notifications;
CREATE POLICY "notifications_update_user_and_admin" ON public.notifications
FOR UPDATE USING (
  (recipient_id = auth.uid()) OR 
  (SELECT authorize('notifications.update'))
) WITH CHECK (
  (recipient_id = auth.uid()) OR 
  (SELECT authorize('notifications.update'))
);

-- Update users policies to use authorize() function consistently
DROP POLICY IF EXISTS "users_delete_admin" ON public.users;
CREATE POLICY "users_delete_admin" ON public.users
FOR DELETE USING (
  (SELECT authorize('users.delete'))
);

DROP POLICY IF EXISTS "users_insert_admin" ON public.users;
CREATE POLICY "users_insert_admin" ON public.users
FOR INSERT WITH CHECK (
  (SELECT authorize('users.create'))
);

DROP POLICY IF EXISTS "users_update_admin" ON public.users;
CREATE POLICY "users_update_admin" ON public.users
FOR UPDATE USING (
  (SELECT authorize('users.update'))
) WITH CHECK (
  (SELECT authorize('users.update'))
);

-- Add missing permissions to role_permissions table
INSERT INTO public.role_permissions (role, permission) VALUES
  ('Admin', 'notifications.delete'),
  ('Admin', 'notifications.update'),
  ('Admin', 'users.delete'),
  ('Admin', 'users.create'),
  ('Admin', 'users.update')
ON CONFLICT (role, permission) DO NOTHING;
