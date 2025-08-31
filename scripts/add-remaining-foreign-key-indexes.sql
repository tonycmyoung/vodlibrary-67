-- Add missing foreign key indexes for optimal performance
-- These indexes improve performance for foreign key constraint checks and JOIN operations

-- Add index for notifications.sender_id foreign key
CREATE INDEX IF NOT EXISTS idx_notifications_sender_id 
ON public.notifications (sender_id);

-- Add index for user_logins.user_id foreign key  
CREATE INDEX IF NOT EXISTS idx_user_logins_user_id 
ON public.user_logins (user_id);

-- Verification: Check that all foreign key indexes now exist
SELECT 
    'Foreign Key Indexes Created' as status,
    COUNT(*) as total_indexes
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname IN (
    'idx_notifications_sender_id',
    'idx_user_logins_user_id',
    'idx_categories_created_by',
    'idx_users_approved_by', 
    'idx_videos_created_by'
);

-- Note: The previously created foreign key indexes (categories_created_by, users_approved_by, videos_created_by)
-- show as "unused" because they haven't been accessed by queries yet, but they're essential for:
-- 1. Foreign key constraint performance
-- 2. JOIN operation optimization
-- 3. Referential integrity checks
-- These should be kept even if they appear unused initially.
