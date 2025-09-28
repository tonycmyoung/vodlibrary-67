-- Create table to track user video view events (following user_logins pattern)
CREATE TABLE user_video_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE, -- Fixed from INTEGER to UUID to match videos table
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Updated to use fully permissive RLS policy pattern
-- Enable Row Level Security
ALTER TABLE user_video_views ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DROP POLICY IF EXISTS "permissive_user_video_views_policy" ON public.user_video_views;

-- Create fully permissive policy with performance optimization
-- Using (select auth.uid()) prevents re-evaluation for each row
-- Security is handled at the application level through proper server actions and middleware
CREATE POLICY "permissive_user_video_views_policy" ON public.user_video_views
FOR ALL USING ((select auth.uid()) IS NOT NULL) WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Grant necessary permissions to authenticated role
GRANT ALL ON public.user_video_views TO authenticated;

-- Ensure service role maintains full access
GRANT ALL ON public.user_video_views TO service_role;

-- Create indexes for performance
CREATE INDEX idx_user_video_views_user_id ON user_video_views(user_id);
CREATE INDEX idx_user_video_views_video_id ON user_video_views(video_id);
CREATE INDEX idx_user_video_views_viewed_at ON user_video_views(viewed_at);
