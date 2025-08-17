-- Create users table with admin approval system
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  full_name TEXT,
  profile_image_url TEXT
);

-- Create categories table for video organization
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  is_published BOOLEAN DEFAULT TRUE
);

-- Create video_categories junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS video_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(video_id, category_id)
);

-- Create user_favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_approved ON users(is_approved);
CREATE INDEX IF NOT EXISTS idx_videos_published ON videos(is_published);
CREATE INDEX IF NOT EXISTS idx_video_categories_video_id ON video_categories(video_id);
CREATE INDEX IF NOT EXISTS idx_video_categories_category_id ON video_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_video_id ON user_favorites(video_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND is_approved = true 
      AND email IN (SELECT email FROM auth.users WHERE email = 'admin@martialarts.com')
    )
  );

-- RLS Policies for videos table
CREATE POLICY "Approved users can view published videos" ON videos
  FOR SELECT USING (
    is_published = true AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND is_approved = true
    )
  );

CREATE POLICY "Admins can manage all videos" ON videos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND is_approved = true 
      AND email IN (SELECT email FROM auth.users WHERE email = 'admin@martialarts.com')
    )
  );

-- RLS Policies for categories table
CREATE POLICY "Approved users can view categories" ON categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND is_approved = true
    )
  );

CREATE POLICY "Admins can manage categories" ON categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND is_approved = true 
      AND email IN (SELECT email FROM auth.users WHERE email = 'admin@martialarts.com')
    )
  );

-- RLS Policies for user_favorites table
CREATE POLICY "Users can manage their own favorites" ON user_favorites
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for video_categories table
CREATE POLICY "Approved users can view video categories" ON video_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND is_approved = true
    )
  );

CREATE POLICY "Admins can manage video categories" ON video_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND is_approved = true 
      AND email IN (SELECT email FROM auth.users WHERE email = 'admin@martialarts.com')
    )
  );
