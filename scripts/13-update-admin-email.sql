-- Updated script to be obsolete since all references have been updated
-- This script is now obsolete - all admin email references have been updated to acmyma@gmail.com
-- Originally designed to migrate from old admin email, but no longer needed

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

-- Removed WHERE clauses that referenced old admin email since they're no longer needed
-- These update statements are now obsolete as all references have been updated at source
-- UPDATE users SET email = 'acmyma@gmail.com' WHERE email = 'admin@martialarts.com';
-- UPDATE auth.users SET email = 'acmyma@gmail.com' WHERE email = 'admin@martialarts.com';
