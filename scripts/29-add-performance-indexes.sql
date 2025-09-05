-- Adding database indexes to improve query performance
-- These indexes will significantly speed up the slow queries identified in debug logs

-- Index for video telemetry queries (last_viewed field used in weekly calculations)
CREATE INDEX IF NOT EXISTS idx_videos_last_viewed ON videos(last_viewed);

-- Index for login tracking queries (user_id field used frequently)
CREATE INDEX IF NOT EXISTS idx_user_logins_user_id ON user_logins(user_id);

-- Index for login date queries (login_time field used in daily login checks)
CREATE INDEX IF NOT EXISTS idx_user_logins_created_at ON user_logins(login_time);

-- Composite index for efficient login tracking (user_id + date combination)
CREATE INDEX IF NOT EXISTS idx_user_logins_user_date ON user_logins(user_id, created_at);

-- Index for video categories if the table exists
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category) WHERE category IS NOT NULL;
