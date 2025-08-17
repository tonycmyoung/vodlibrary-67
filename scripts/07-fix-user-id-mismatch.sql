-- Fix user ID mismatch between auth.users and public.users tables
-- The profile update is failing because the IDs don't match

-- First, let's see the current state
SELECT 'Current public.users record:' as info;
SELECT id, email, full_name, is_approved, profile_image_url 
FROM public.users 
WHERE email = 'acmyau@gmail.com';

SELECT 'Current auth.users record:' as info;
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'acmyau@gmail.com';

-- Update the public.users record to use the correct auth user ID
UPDATE public.users 
SET id = (
    SELECT id 
    FROM auth.users 
    WHERE email = 'acmyau@gmail.com'
)
WHERE email = 'acmyau@gmail.com';

-- Verify the fix
SELECT 'After fix - public.users record:' as info;
SELECT id, email, full_name, is_approved, profile_image_url 
FROM public.users 
WHERE email = 'acmyau@gmail.com';

-- Confirm IDs now match
SELECT 'ID match verification:' as info;
SELECT 
    CASE 
        WHEN p.id = a.id THEN 'IDs MATCH - Profile updates should work now!'
        ELSE 'IDs STILL DO NOT MATCH - Issue persists'
    END as status
FROM public.users p
JOIN auth.users a ON p.email = a.email
WHERE p.email = 'acmyau@gmail.com';
