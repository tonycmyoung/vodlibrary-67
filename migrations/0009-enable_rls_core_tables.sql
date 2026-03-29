-- Migration: 0009_enable_rls_core_tables
-- Description: Enable RLS and create policies for core tables
-- Created: 2026-03-29

-- Enable Row Level Security for core tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE performers ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_performers ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculums ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_curriculums ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view approved users" ON users
  FOR SELECT USING (
    is_approved = true OR auth.uid() = id
  );

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for videos table
CREATE POLICY "Approved users can view published videos" ON videos
  FOR SELECT USING (
    (is_published = true AND 
     EXISTS (
       SELECT 1 FROM users 
       WHERE id = auth.uid() 
       AND is_approved = true
     )) OR
    created_by = auth.uid()
  );

CREATE POLICY "Users can create videos" ON videos
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own videos" ON videos
  FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for categories table
CREATE POLICY "Approved users can view categories" ON categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND is_approved = true
    )
  );

-- RLS Policies for user_favorites table
CREATE POLICY "Users can manage their own favorites" ON user_favorites
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for video_categories table
CREATE POLICY "Users can view video categories" ON video_categories
  FOR SELECT USING (true);

-- RLS Policies for performers table
CREATE POLICY "Users can view performers" ON performers
  FOR SELECT USING (true);

-- RLS Policies for video_performers table
CREATE POLICY "Users can view video performers" ON video_performers
  FOR SELECT USING (true);

-- RLS Policies for curriculums table
CREATE POLICY "Users can view curriculums" ON curriculums
  FOR SELECT USING (true);

-- RLS Policies for video_curriculums table
CREATE POLICY "Users can view video curriculums" ON video_curriculums
  FOR SELECT USING (true);
