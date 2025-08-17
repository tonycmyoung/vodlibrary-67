-- Manually confirm the admin user's email
-- This bypasses the email confirmation requirement for admin@martialarts.com

UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  updated_at = NOW()
WHERE email = 'admin@martialarts.com';

-- Also ensure the user is in our users table
INSERT INTO public.users (
  id, 
  email, 
  full_name, 
  is_approved, 
  approved_at, 
  approved_by,
  created_at, 
  updated_at
)
SELECT 
  id,
  'admin@martialarts.com',
  'Administrator',
  true,
  NOW(),
  id, -- self-approved
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'admin@martialarts.com'
ON CONFLICT (id) DO UPDATE SET
  is_approved = true,
  approved_at = NOW(),
  approved_by = users.id;
