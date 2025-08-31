-- Check current RLS policies on users table
SELECT 
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
ORDER BY cmd, policyname;

-- Also check if there are any issues with auth.uid() function
SELECT 
    'Current auth.uid()' as test_name,
    auth.uid() as current_user_id;

-- Test if we can select from users table as authenticated user
SELECT 
    'User self-access test' as test_name,
    COUNT(*) as accessible_records
FROM public.users 
WHERE id::text = auth.uid()::text;
