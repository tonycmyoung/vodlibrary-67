-- Fix RLS Performance Issues
-- This script addresses Supabase Performance Advisor warnings

-- 1. Fix auth function re-evaluation in RLS policies
-- Replace auth.<function>() with (select auth.<function>()) for better performance

-- Drop existing policies that have performance issues
DROP POLICY IF EXISTS "users_select_own_or_admin" ON public.users;
DROP POLICY IF EXISTS "Service role can manage all invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can view their own sent invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can insert invitations" ON public.invitations;

-- Recreate users policy with optimized auth function calls
CREATE POLICY "users_select_own_or_admin" ON public.users
FOR SELECT USING (
  id = (select auth.uid()) OR 
  (select auth.jwt()) ->> 'role' = 'service_role' OR
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = (select auth.uid()) AND u.role = 'admin'
  )
);

-- Consolidate invitations policies to reduce multiple permissive policies
-- Single policy that handles both service role and user access
CREATE POLICY "invitations_access_policy" ON public.invitations
FOR ALL USING (
  -- Service role can manage all invitations
  (select auth.jwt()) ->> 'role' = 'service_role' OR
  -- Users can view/insert their own sent invitations
  invited_by = (select auth.uid())
);

-- Enable RLS on invitations table if not already enabled
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Verify policies are applied correctly
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('users', 'invitations') 
ORDER BY tablename, policyname;
