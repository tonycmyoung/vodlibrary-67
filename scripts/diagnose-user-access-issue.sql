-- Diagnostic script to check user record existence and RLS policy issues
-- for acmyau@gmail.com login problem

-- 1. Check if the user record exists in public.users table
SELECT 
    'User record check' as test_name,
    id,
    email,
    is_approved,
    role,
    created_at
FROM public.users 
WHERE id = '92550655-7b39-4b2e-99c8-40b2c1256873'::uuid
   OR email = 'acmyau@gmail.com';

-- 2. Check if the user exists in auth.users (system table)
SELECT 
    'Auth user check' as test_name,
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users 
WHERE id = '92550655-7b39-4b2e-99c8-40b2c1256873'::uuid
   OR email = 'acmyau@gmail.com';

-- 3. Check current RLS policies on users table
SELECT 
    'RLS policies check' as test_name,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

-- 4. Test if we can query the user record with different approaches
-- This simulates what the middleware is trying to do
SELECT 
    'Direct user query test' as test_name,
    count(*) as record_count
FROM public.users 
WHERE id = '92550655-7b39-4b2e-99c8-40b2c1256873'::uuid;

-- 5. Check if RLS is enabled on users table
SELECT 
    'RLS status check' as test_name,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';
