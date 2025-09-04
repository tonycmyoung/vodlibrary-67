-- Fix RLS policies to allow middleware database queries for authentication

-- Drop existing problematic policies on users table
DROP POLICY IF EXISTS "users_policy" ON public.users;

-- Create new policies that allow middleware to function
-- Policy 1: Allow authenticated users to read their own user record (for middleware)
CREATE POLICY "users_read_own" ON public.users
FOR SELECT USING (
  auth.uid() = id
);

-- Policy 2: Allow admins to read all user records
CREATE POLICY "users_admin_access" ON public.users
FOR ALL USING (
  auth.jwt() ->> 'app_metadata' ->> 'role' = 'Admin'
) WITH CHECK (
  auth.jwt() ->> 'app_metadata' ->> 'role' = 'Admin'
);

-- Policy 3: Allow users to update their own records
CREATE POLICY "users_update_own" ON public.users
FOR UPDATE USING (
  auth.uid() = id
) WITH CHECK (
  auth.uid() = id
);

-- Ensure videos are visible to approved users
DROP POLICY IF EXISTS "videos_policy" ON public.videos;

CREATE POLICY "videos_read_approved" ON public.videos
FOR SELECT USING (
  is_published = true AND (
    auth.jwt() ->> 'app_metadata' ->> 'status' = 'approved' OR
    auth.jwt() ->> 'app_metadata' ->> 'role' = 'Admin'
  )
);

CREATE POLICY "videos_admin_manage" ON public.videos
FOR ALL USING (
  auth.jwt() ->> 'app_metadata' ->> 'role' = 'Admin'
) WITH CHECK (
  auth.jwt() ->> 'app_metadata' ->> 'role' = 'Admin'
);
