-- Add views column to videos table to track video view counts
ALTER TABLE videos ADD COLUMN views INTEGER DEFAULT 0;

-- Add index for better performance when sorting by views
CREATE INDEX idx_videos_views ON videos(views);

-- Update existing videos to have 0 views
UPDATE videos SET views = 0 WHERE views IS NULL;
