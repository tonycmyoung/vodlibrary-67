-- Manual confirmation for test user acmyau@gmail.com
-- This script manually confirms the email for the test user since email confirmation
-- doesn't work in development environment (localhost redirect issues)

-- Update the auth.users table to mark email as confirmed
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW(),
  updated_at = NOW()
WHERE email = 'acmyau@gmail.com';

-- Verify the user exists in our public users table
-- If not, insert them (in case the signup process was interrupted)
INSERT INTO public.users (id, email, full_name, is_approved, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', 'Test User') as full_name,
  false as is_approved,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users au
WHERE au.email = 'acmyau@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
  );

-- Display confirmation
SELECT 
  'User confirmation completed' as status,
  email,
  email_confirmed_at,
  confirmed_at
FROM auth.users 
WHERE email = 'acmyau@gmail.com';
