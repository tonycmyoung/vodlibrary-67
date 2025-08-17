-- Clean up the broken acmyau@gmail.com user record
-- This removes the user from both auth and public tables so they can sign up fresh

-- First, let's see what we have
SELECT 'Current auth users:' as info;
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'acmyau@gmail.com';

SELECT 'Current public users:' as info;
SELECT id, email, full_name, is_approved, created_at 
FROM public.users 
WHERE email = 'acmyau@gmail.com';

-- Delete from public users table first (due to foreign key constraints)
DELETE FROM public.users WHERE email = 'acmyau@gmail.com';

-- Delete from auth users table
DELETE FROM auth.users WHERE email = 'acmyau@gmail.com';

-- Verify cleanup
SELECT 'After cleanup - auth users:' as info;
SELECT COUNT(*) as auth_user_count 
FROM auth.users 
WHERE email = 'acmyau@gmail.com';

SELECT 'After cleanup - public users:' as info;
SELECT COUNT(*) as public_user_count 
FROM public.users 
WHERE email = 'acmyau@gmail.com';

SELECT 'Cleanup complete. User can now sign up fresh with simplified process.' as result;
