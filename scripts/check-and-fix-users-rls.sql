-- Check current users table RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'users';

-- The issue is likely that the SELECT policy only allows users to see themselves
-- We need to allow admins to see all users for the notification dropdown

-- Drop existing problematic SELECT policy if it exists
DROP POLICY IF EXISTS "users_select_fixed" ON users;

-- Create new SELECT policy that allows:
-- 1. Users to see themselves
-- 2. Admins to see all users
CREATE POLICY "users_select_admin_and_self" ON users
FOR SELECT
TO authenticated
USING (
  (id = (SELECT auth.uid())) OR 
  (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'Admin')
);

-- Verify the new policy
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'SELECT';
