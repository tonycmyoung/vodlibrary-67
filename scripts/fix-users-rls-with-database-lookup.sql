-- Fix users table RLS policy to use database role lookup instead of JWT metadata
-- The JWT app_metadata doesn't contain role information, so we need to check the database

-- Drop the existing policy that relies on JWT metadata
DROP POLICY IF EXISTS "users_select_admin_and_self" ON users;

-- Create new policy that checks role from database
CREATE POLICY "users_select_self_and_admin_db_lookup" ON users
FOR SELECT
TO authenticated
USING (
  -- Users can see themselves
  (id = auth.uid()) 
  OR 
  -- Admins can see all users (check role from database)
  (
    EXISTS (
      SELECT 1 FROM users admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'Admin'
    )
  )
);

-- Verify the new policy
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users' AND policyname = 'users_select_self_and_admin_db_lookup';
