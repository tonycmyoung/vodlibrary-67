-- Insert default categories
INSERT INTO categories (name, description, color) VALUES
  ('Karate', 'Traditional karate techniques and forms', '#DC2626'),
  ('Kung Fu', 'Chinese martial arts and forms', '#EA580C'),
  ('Taekwondo', 'Korean martial art focusing on kicks', '#CA8A04'),
  ('Jiu-Jitsu', 'Ground fighting and grappling techniques', '#16A34A'),
  ('Muay Thai', 'Thai boxing and striking techniques', '#2563EB'),
  ('Aikido', 'Japanese martial art of harmony', '#7C3AED'),
  ('Basics', 'Fundamental techniques for beginners', '#6B7280'),
  ('Advanced', 'Advanced techniques and combinations', '#1F2937')
ON CONFLICT (name) DO NOTHING;

-- Adding admin user creation
-- Note: You'll need to create the admin account through Supabase Auth first
-- Then run this script to set up the admin profile
-- 
-- To create the admin account:
-- 1. Go to your Supabase dashboard > Authentication > Users
-- 2. Click "Add user" 
-- 3. Email: admin@martialarts.com
-- 4. Password: admin123 (change this after first login!)
-- 5. Then run this script to create the profile

-- Insert admin user profile (only if the auth user exists)
INSERT INTO users (id, email, full_name, is_approved, approved_at)
SELECT 
  auth.uid() as id,
  'admin@martialarts.com' as email,
  'System Administrator' as full_name,
  true as is_approved,
  NOW() as approved_at
WHERE EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'admin@martialarts.com'
)
ON CONFLICT (email) DO UPDATE SET
  is_approved = true,
  approved_at = COALESCE(users.approved_at, NOW());
