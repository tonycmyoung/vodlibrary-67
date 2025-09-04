-- Revert RLS Policy Changes Back to Original State
-- This script undoes the performance optimizations that caused authentication and access issues

-- Drop the consolidated invitations policy and restore original multiple policies
DROP POLICY IF EXISTS "invitations_access_policy" ON public.invitations;

-- Restore original invitations policies (multiple permissive policies)
CREATE POLICY "Users can view their own invitations" ON public.invitations
    FOR SELECT USING (auth.uid() = invited_by);

CREATE POLICY "Users can insert invitations" ON public.invitations
    FOR INSERT WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "Users can update their own invitations" ON public.invitations
    FOR UPDATE USING (auth.uid() = invited_by);

CREATE POLICY "Service role can access all invitations" ON public.invitations
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Revert users table policies back to original auth function calls (without SELECT wrapper)
DROP POLICY IF EXISTS "Users can view own profile optimized" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile optimized" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile optimized" ON public.users;
DROP POLICY IF EXISTS "Admin and service role can delete users optimized" ON public.users;

-- Restore original users policies with direct auth function calls
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin and service role can delete users" ON public.users
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'service_role' OR 
        (auth.jwt() ->> 'user_role' = 'Admin' AND auth.uid() IS NOT NULL)
    );

-- Add service role access policies for users table
CREATE POLICY "Service role can access all users" ON public.users
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Removed IF NOT EXISTS from CREATE POLICY statements as PostgreSQL doesn't support this syntax
-- Ensure all other tables have proper service role access
DROP POLICY IF EXISTS "Service role can access all videos" ON public.videos;
CREATE POLICY "Service role can access all videos" ON public.videos
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role can access all categories" ON public.categories;
CREATE POLICY "Service role can access all categories" ON public.categories
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role can access all user_logins" ON public.user_logins;
CREATE POLICY "Service role can access all user_logins" ON public.user_logins
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant necessary permissions
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.invitations TO service_role;
GRANT ALL ON public.videos TO service_role;
GRANT ALL ON public.categories TO service_role;
GRANT ALL ON public.user_logins TO service_role;
