-- Updated comments to remove references to old admin email
-- Manually confirm the admin user's email
-- This bypasses the email confirmation requirement for acmyma@gmail.com

UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  updated_at = NOW()
-- Removed reference to old admin email in comment
WHERE email = 'acmyma@gmail.com';

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
  -- Removed reference to old admin email in comment
  'acmyma@gmail.com',
  'Administrator',
  true,
  NOW(),
  id, -- self-approved
  NOW(),
  NOW()
FROM auth.users 
-- Removed reference to old admin email in comment
WHERE email = 'acmyma@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  is_approved = true,
  approved_at = NOW(),
  approved_by = users.id;
