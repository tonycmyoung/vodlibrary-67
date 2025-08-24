-- Fix infinite recursion in users table RLS policies
-- The issue is that our policies are querying the users table from within users table policies

-- Drop the problematic policies
DROP POLICY IF EXISTS "users_unified_select" ON public.users;
DROP POLICY IF EXISTS "users_insert_admin" ON public.users;
DROP POLICY IF EXISTS "users_update_admin" ON public.users;
DROP POLICY IF EXISTS "users_delete_admin" ON public.users;

-- Create new policies that don't cause recursion
-- Use auth.jwt() to check role directly from JWT token instead of querying users table

-- SELECT policy: Users can see their own profile, admins can see all
CREATE POLICY "users_select_policy" ON public.users
FOR SELECT USING (
  (id = (SELECT auth.uid())) OR
  ((SELECT auth.jwt() ->> 'user_metadata' ->> 'role') = 'Admin')
);

-- INSERT policy: Only admins can create users (or allow public for registration)
CREATE POLICY "users_insert_policy" ON public.users
FOR INSERT WITH CHECK (
  ((SELECT auth.jwt() ->> 'user_metadata' ->> 'role') = 'Admin') OR
  (id = (SELECT auth.uid()))
);

-- UPDATE policy: Users can update their own profile, admins can update all
CREATE POLICY "users_update_policy" ON public.users
FOR UPDATE USING (
  (id = (SELECT auth.uid())) OR
  ((SELECT auth.jwt() ->> 'user_metadata' ->> 'role') = 'Admin')
) WITH CHECK (
  (id = (SELECT auth.uid())) OR
  ((SELECT auth.jwt() ->> 'user_metadata' ->> 'role') = 'Admin')
);

-- DELETE policy: Only admins can delete users
CREATE POLICY "users_delete_policy" ON public.users
FOR DELETE USING (
  ((SELECT auth.jwt() ->> 'user_metadata' ->> 'role') = 'Admin')
);
