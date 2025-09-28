-- PHASE 5: Clean up old video view fields (RUN ONLY AFTER VERIFYING NEW SYSTEM WORKS)
-- This script removes the old views and last_viewed columns from the videos table
-- WARNING: This is irreversible - make sure the new video_views system is working correctly first

-- First, verify that the new system has data
DO $$
DECLARE
    old_view_count INTEGER;
    new_view_count INTEGER;
BEGIN
    -- Count views in old system
    SELECT COALESCE(SUM(views), 0) INTO old_view_count FROM videos;
    
    -- Count views in new system
    SELECT COUNT(*) INTO new_view_count FROM video_views;
    
    RAISE NOTICE 'Old system total views: %', old_view_count;
    RAISE NOTICE 'New system total views: %', new_view_count;
    
    -- Safety check - don't proceed if new system has significantly fewer views
    IF new_view_count < (old_view_count * 0.9) THEN
        RAISE EXCEPTION 'New system has significantly fewer views than old system. Aborting cleanup.';
    END IF;
    
    RAISE NOTICE 'View counts look reasonable. Proceeding with cleanup...';
END $$;

-- Remove the old columns (this is irreversible!)
-- Uncomment these lines only when you're absolutely sure the new system is working:

-- ALTER TABLE videos DROP COLUMN IF EXISTS views;
-- ALTER TABLE videos DROP COLUMN IF EXISTS last_viewed;

-- RAISE NOTICE 'Old view columns removed successfully';

-- Note: The incrementVideoViews function will need to be updated to remove the dual-write logic
-- This should be done in the application code, not in SQL
