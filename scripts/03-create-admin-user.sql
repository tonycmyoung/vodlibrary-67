-- Updated comments to remove references to old admin email
-- Create admin user directly in Supabase auth system
-- This creates the admin user with email: acmyma@gmail.com and password: admin123

-- First, insert into auth.users table
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  -- Removed reference to old admin email in comment
  'acmyma@gmail.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  '',
  '{"provider": "email", "providers": ["email"]}',
  '{}'
) ON CONFLICT (email) DO NOTHING;

-- Then create the user profile
INSERT INTO public.users (
  id,
  email,
  full_name,
  is_approved,
  is_admin,
  created_at
) VALUES (
  -- Removed reference to old admin email in comment
  (SELECT id FROM auth.users WHERE email = 'acmyma@gmail.com'),
  'acmyma@gmail.com',
  'Administrator',
  true,
  true,
  now()
) ON CONFLICT (id) DO UPDATE SET
  is_approved = true,
  is_admin = true;
