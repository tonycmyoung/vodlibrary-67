-- Fix notification RLS policies to allow users to update and delete their own notifications

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "notifications_update_admin" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_admin" ON notifications;

-- Create new UPDATE policy: Users can update notifications where they are the recipient, admins can update all
CREATE POLICY "notifications_update_user_and_admin" ON notifications
FOR UPDATE
USING (
  (recipient_id = auth.uid()) OR 
  (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'Admin')
)
WITH CHECK (
  (recipient_id = auth.uid()) OR 
  (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'Admin')
);

-- Create new DELETE policy: Users can delete notifications where they are the recipient, admins can delete all
CREATE POLICY "notifications_delete_user_and_admin" ON notifications
FOR DELETE
USING (
  (recipient_id = auth.uid()) OR 
  (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'Admin')
);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'notifications' 
AND cmd IN ('UPDATE', 'DELETE')
ORDER BY cmd, policyname;
