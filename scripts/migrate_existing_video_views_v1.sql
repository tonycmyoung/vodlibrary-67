-- Migrate existing video view counts from videos table to video_views table
-- This creates individual view records based on the aggregate counts

DO $$
DECLARE
    video_record RECORD;
    view_count INTEGER;
    i INTEGER;
    base_timestamp TIMESTAMP WITH TIME ZONE;
    view_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Loop through all videos that have view counts
    FOR video_record IN 
        SELECT id, views, last_viewed, created_at 
        FROM videos 
        WHERE views > 0
    LOOP
        view_count := COALESCE(video_record.views, 0);
        
        -- Use last_viewed if available, otherwise use created_at a```sql file="scripts/migrate_existing_video_views_v1.sql"
-- Migrate existing video view counts from videos table to video_views table
-- This creates individual view records based on the aggregate counts

DO $$
DECLARE
    video_record RECORD;
    view_count INTEGER;
    i INTEGER;
    base_timestamp TIMESTAMP WITH TIME ZONE;
    view_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Loop through all videos that have view counts
    FOR video_record IN 
        SELECT id, views, last_viewed, created_at 
        FROM videos 
        WHERE views > 0
    LOOP
        view_count := COALESCE(video_record.views, 0);
        
        -- Use last_viewed if available, otherwise use created_at as base
        base_timestamp := COALESCE(video_record.last_viewed, video_record.created_at);
        
        -- Create individual view records
        -- Spread them over time to simulate realistic viewing patterns
        FOR i IN 1..view_count LOOP
            -- Calculate timestamp: spread views over the period from creation to last_viewed
            -- Most recent view gets the last_viewed timestamp
            IF i = view_count AND video_record.last_viewed IS NOT NULL THEN
                view_timestamp := video_record.last_viewed;
            ELSE
                -- Distribute earlier views over time (random intervals)
                view_timestamp := video_record.created_at + 
                    (base_timestamp - video_record.created_at) * (i::FLOAT / view_count::FLOAT) +
                    (RANDOM() * INTERVAL '1 hour'); -- Add some randomness
            END IF;
            
            -- Insert the view record (anonymous views since we don't know the original users)
            INSERT INTO video_views (video_id, user_id, viewed_at)
            VALUES (video_record.id, NULL, view_timestamp);
        END LOOP;
        
        RAISE NOTICE 'Migrated % views for video %', view_count, video_record.id;
    END LOOP;
    
    RAISE NOTICE 'Migration completed successfully';
END $$;

-- Verify the migration
SELECT 
    v.id,
    v.title,
    v.views as old_views,
    COUNT(vv.id) as new_views,
    v.last_viewed as old_last_viewed,
    MAX(vv.viewed_at) as new_last_viewed
FROM videos v
LEFT JOIN video_views vv ON v.id = vv.video_id
WHERE v.views > 0
GROUP BY v.id, v.title, v.views, v.last_viewed
ORDER BY v.views DESC
LIMIT 10;
