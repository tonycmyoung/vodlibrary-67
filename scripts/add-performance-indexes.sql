-- Add indexes to optimize video listing queries
-- These will speed up the complex JOINs in the video listing query

-- Index for video_categories foreign key lookups
CREATE INDEX IF NOT EXISTS idx_video_categories_video_id ON video_categories(video_id);
CREATE INDEX IF NOT EXISTS idx_video_categories_category_id ON video_categories(category_id);

-- Index for video_performers foreign key lookups  
CREATE INDEX IF NOT EXISTS idx_video_performers_video_id ON video_performers(video_id);
CREATE INDEX IF NOT EXISTS idx_video_performers_performer_id ON video_performers(performer_id);

-- Composite index for published videos (most common filter)
CREATE INDEX IF NOT EXISTS idx_videos_published ON videos(is_published) WHERE is_published = true;

-- Index for user_logins telemetry queries (login_time filtering)
CREATE INDEX IF NOT EXISTS idx_user_logins_time_user ON user_logins(login_time, user_id);

-- Index for notifications queries (recipient_id with created_at ordering)
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created ON notifications(recipient_id, created_at DESC);
