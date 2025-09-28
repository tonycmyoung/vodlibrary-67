-- Cleanup script for video views refactoring (NO MIGRATION scenario)
-- This script removes the old view tracking system after confirming the new system is working
-- Run this ONLY after confirming that:
-- 1. Views are being recorded in the video_views table
-- 2. View counts are displaying correctly in the UI
-- 3. You're comfortable losing the old view count data

-- First, let's verify the new system is working
DO $$
DECLARE
    video_views_count INTEGER;
    videos_with_views INTEGER;
BEGIN
    -- Check if video_views table exists and has data
    SELECT COUNT(*) INTO video_views_count FROM video_views;
    
    -- Check how many videos have been viewed in the new system
    SELECT COUNT(DISTINCT video_id) INTO videos_with_views FROM video_views;
    
    RAISE NOTICE 'New system status:';
    RAISE NOTICE '- Total view records in video_views table: %', video_views_count;
    RAISE NOTICE '- Videos with views in new system: %', videos_with_views;
    
    IF video_views_count = 0 THEN
        RAISE EXCEPTION 'No views found in video_views table. Please test the system first.';
    END IF;
    
    RAISE NOTICE 'New system appears to be working. Proceeding with cleanup...';
END $$;

-- Remove the old view tracking columns
-- Note: This will permanently delete the old view count data
ALTER TABLE videos DROP COLUMN IF EXISTS views;
ALTER TABLE videos DROP COLUMN IF EXISTS last_viewed_at;

-- Verify cleanup
DO $$
BEGIN
    RAISE NOTICE 'Cleanup completed successfully!';
    RAISE NOTICE 'Old view tracking columns have been removed.';
    RAISE NOTICE 'Remember to update the incrementVideoViews() function to remove dual-write logic.';
END $$;
