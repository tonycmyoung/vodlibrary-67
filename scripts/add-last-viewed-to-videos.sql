-- Add last_viewed field to videos table for better view tracking
ALTER TABLE videos ADD COLUMN last_viewed TIMESTAMP WITH TIME ZONE;

-- Create index for efficient querying by last_viewed date
CREATE INDEX idx_videos_last_viewed ON videos(last_viewed);

-- Update existing videos to have a reasonable last_viewed date based on their view count
-- Videos with views get set to a recent date, others remain null
UPDATE videos 
SET last_viewed = CURRENT_TIMESTAMP - INTERVAL '7 days'
WHERE views > 0;
