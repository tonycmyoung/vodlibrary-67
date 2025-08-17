-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can manage all videos" ON videos;
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
DROP POLICY IF EXISTS "Admins can manage video categories" ON video_categories;

-- Fixed RLS policies to avoid infinite recursion by using auth.users directly
-- Create new policies that don't cause recursion
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    auth.email() = 'admin@martialarts.com'
  );

CREATE POLICY "Admins can manage all videos" ON videos
  FOR ALL USING (
    auth.email() = 'admin@martialarts.com'
  );

CREATE POLICY "Admins can manage categories" ON categories
  FOR ALL USING (
    auth.email() = 'admin@martialarts.com'
  );

CREATE POLICY "Admins can manage video categories" ON video_categories
  FOR ALL USING (
    auth.email() = 'admin@martialarts.com'
  );

-- Add policy for admins to insert/update users (for user management)
CREATE POLICY "Admins can manage all users" ON users
  FOR ALL USING (
    auth.email() = 'admin@martialarts.com'
  );
