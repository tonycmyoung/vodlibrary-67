-- Create video_views table for detailed view tracking
-- This replaces the aggregate views/last_viewed fields in the videos table

CREATE TABLE IF NOT EXISTS video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- nullable for anonymous views
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  
  -- Add index for common queries
  CONSTRAINT video_views_video_id_viewed_at_idx UNIQUE (video_id, viewed_at, id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_user_id ON video_views(user_id);
CREATE INDEX IF NOT EXISTS idx_video_views_viewed_at ON video_views(viewed_at);

-- Enable RLS
ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;

-- Using the standard permissive RLS policy pattern
-- Simple permissive policy for all operations
CREATE POLICY "permissive_video_views_policy" ON video_views
  FOR ALL USING (( SELECT auth.uid() AS uid) IS NOT NULL);

-- Removed the video_view_stats view - queries will be done directly on video_views table
