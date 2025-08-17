-- Fix authentication status for acmyau@gmail.com user
-- This script checks and fixes the email confirmation status

-- First, let's check the current auth user status
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data
FROM auth.users 
WHERE email = 'acmyau@gmail.com';

-- Update the user to be confirmed if not already
UPDATE auth.users 
SET 
    email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email = 'acmyau@gmail.com' 
AND email_confirmed_at IS NULL;

-- Check if the update was successful
SELECT 
    id,
    email,
    email_confirmed_at,
    'User is now confirmed' as status
FROM auth.users 
WHERE email = 'acmyau@gmail.com';

-- Also check the public users table to ensure consistency
SELECT 
    id,
    email,
    full_name,
    is_approved,
    created_at
FROM public.users 
WHERE email = 'acmyau@gmail.com';
