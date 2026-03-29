-- Migration: 0007_add_user_tracking
-- Description: Create user_logins and user_video_views tables for tracking user activity
-- Created: 2026-03-29

-- Create table to track user login events
CREATE TABLE IF NOT EXISTS user_logins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_logins_user_id ON user_logins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_logins_login_time ON user_logins(login_time);

-- Add RLS policies
ALTER TABLE user_logins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own login records" ON user_logins
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all login records" ON user_logins
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_approved = true
        )
    );

-- Create table to track user video view events
CREATE TABLE IF NOT EXISTS user_video_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_video_views_user_id ON user_video_views(user_id);
CREATE INDEX IF NOT EXISTS idx_user_video_views_video_id ON user_video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_user_video_views_viewed_at ON user_video_views(viewed_at);

-- Enable Row Level Security
ALTER TABLE user_video_views ENABLE ROW LEVEL SECURITY;

-- Create fully permissive policy with performance optimization
CREATE POLICY "permissive_user_video_views_policy" ON public.user_video_views
FOR ALL USING ((select auth.uid()) IS NOT NULL) WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Grant necessary permissions
GRANT ALL ON public.user_video_views TO authenticated;
GRANT ALL ON public.user_video_views TO service_role;
