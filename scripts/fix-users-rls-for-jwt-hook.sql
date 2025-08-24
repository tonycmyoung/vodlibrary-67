-- Fix users table RLS policy to allow supabase_auth_admin role (used by JWT hooks) to read user data

-- Drop existing SELECT policy
DROP POLICY IF EXISTS users_select_admin_and_self ON public.users;

-- Create new SELECT policy that includes supabase_auth_admin role
CREATE POLICY users_select_admin_and_self ON public.users
FOR SELECT
TO authenticated, supabase_auth_admin
USING (
  -- Allow users to see themselves
  (id = (SELECT auth.uid()::text)) 
  OR 
  -- Allow users with Admin role to see all users
  (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'Admin') 
  OR
  -- Allow supabase_auth_admin role (used by JWT hooks) to see all users
  (auth.role() = 'supabase_auth_admin')
);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users' AND policyname = 'users_select_admin_and_self';
