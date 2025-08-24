-- Fix inconsistent RLS policies to use authorize() function
-- This updates policies that still use old JWT app_metadata approach

-- Update notifications policies to use authorize() function
DROP POLICY IF EXISTS notifications_delete_user_and_admin ON public.notifications;
CREATE POLICY notifications_delete_user_and_admin ON public.notifications
FOR DELETE USING (
  (recipient_id = (SELECT auth.uid())) OR (SELECT authorize('notifications.delete'))
);

DROP POLICY IF EXISTS notifications_update_user_and_admin ON public.notifications;
CREATE POLICY notifications_update_user_and_admin ON public.notifications
FOR UPDATE USING (
  (recipient_id = (SELECT auth.uid())) OR (SELECT authorize('notifications.update'))
) WITH CHECK (
  (recipient_id = (SELECT auth.uid())) OR (SELECT authorize('notifications.update'))
);

-- Update users policies to use authorize() function
DROP POLICY IF EXISTS users_delete_admin ON public.users;
CREATE POLICY users_delete_admin ON public.users
FOR DELETE USING (
  (SELECT authorize('users.delete'))
);

DROP POLICY IF EXISTS users_insert_admin ON public.users;
CREATE POLICY users_insert_admin ON public.users
FOR INSERT WITH CHECK (
  (SELECT authorize('users.insert'))
);

DROP POLICY IF EXISTS users_update_admin ON public.users;
CREATE POLICY users_update_admin ON public.users
FOR UPDATE USING (
  (id = (SELECT auth.uid())) OR (SELECT authorize('users.update'))
) WITH CHECK (
  (id = (SELECT auth.uid())) OR (SELECT authorize('users.update'))
);

-- Verify the authorize function is working
SELECT 'authorize function test' as test, authorize('test.permission') as result;
