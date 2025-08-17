-- Complete cleanup of acmyau@gmail.com user account
-- This removes all traces of the problematic user from both auth and public tables

-- Remove from public users table
DELETE FROM public.users 
WHERE email = 'acmyau@gmail.com';

-- Remove from auth users table (requires admin privileges)
DELETE FROM auth.users 
WHERE email = 'acmyau@gmail.com';

-- Verify cleanup
SELECT 'Public users table' as table_name, COUNT(*) as remaining_records 
FROM public.users 
WHERE email = 'acmyau@gmail.com'
UNION ALL
SELECT 'Auth users table' as table_name, COUNT(*) as remaining_records 
FROM auth.users 
WHERE email = 'acmyau@gmail.com';

-- Show current user counts
SELECT 'Total public users' as info, COUNT(*) as count FROM public.users
UNION ALL
SELECT 'Total auth users' as info, COUNT(*) as count FROM auth.users;
