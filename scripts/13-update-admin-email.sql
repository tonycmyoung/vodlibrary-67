-- Update administrator email from admin@martialarts.com to acmyma@gmail.com
-- This script updates all references to the admin email across the database

-- Update RLS policies to use new admin email
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can manage all videos" ON videos;
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
DROP POLICY IF EXISTS "Admins can manage video categories" ON video_categories;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

-- Create new policies with updated admin email
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    auth.email() = 'acmyma@gmail.com'
  );

CREATE POLICY "Admins can manage all videos" ON videos
  FOR ALL USING (
    auth.email() = 'acmyma@gmail.com'
  );

CREATE POLICY "Admins can manage categories" ON categories
  FOR ALL USING (
    auth.email() = 'acmyma@gmail.com'
  );

CREATE POLICY "Admins can manage video categories" ON video_categories
  FOR ALL USING (
    auth.email() = 'acmyma@gmail.com'
  );

CREATE POLICY "Admins can manage all users" ON users
  FOR ALL USING (
    auth.email() = 'acmyma@gmail.com'
  );

-- Update existing admin user record if it exists
UPDATE users 
SET email = 'acmyma@gmail.com'
WHERE email = 'admin@martialarts.com';

-- Update auth.users table if the admin user exists there
UPDATE auth.users 
SET email = 'acmyma@gmail.com'
WHERE email = 'admin@martialarts.com';
