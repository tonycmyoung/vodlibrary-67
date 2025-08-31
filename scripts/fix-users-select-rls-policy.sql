-- Fix users table SELECT RLS policy to allow users to read their own records
-- This resolves the "Account Under Review" issue for approved users

-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "users_select_authorized" ON public.users;

-- Create a new SELECT policy that allows:
-- 1. Users to read their own records (for middleware approval checks)
-- 2. Admins to read all records (for admin functionality)
-- Fixed UUID to text type casting by ensuring both sides are cast to text
CREATE POLICY "users_select_own_or_admin" ON public.users
    FOR SELECT
    USING (
        (id::text = (SELECT auth.uid()::text)) OR 
        (SELECT authorize('users.read'::text) AS authorize)
    );

-- Verify the new policy was created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'users' 
AND cmd = 'SELECT'
ORDER BY policyname;
