-- Database Index Optimization Script
-- Adds missing foreign key indexes and removes unused indexes

-- =============================================================================
-- ADD MISSING FOREIGN KEY INDEXES
-- =============================================================================

-- Add index for categories.created_by foreign key
CREATE INDEX IF NOT EXISTS idx_categories_created_by 
ON public.categories (created_by);

-- Add index for users.approved_by foreign key  
CREATE INDEX IF NOT EXISTS idx_users_approved_by 
ON public.users (approved_by);

-- Add index for videos.created_by foreign key
CREATE INDEX IF NOT EXISTS idx_videos_created_by 
ON public.videos (created_by);

-- =============================================================================
-- REMOVE UNUSED INDEXES
-- =============================================================================

-- Remove unused notification indexes
DROP INDEX IF EXISTS public.idx_notifications_sender_id;
DROP INDEX IF EXISTS public.idx_notifications_is_read;
DROP INDEX IF EXISTS public.idx_notifications_broadcast;
DROP INDEX IF EXISTS public.idx_notifications_recipient_created;
DROP INDEX IF EXISTS public.idx_notifications_sender_created;

-- Remove unused user indexes
DROP INDEX IF EXISTS public.idx_users_role_approved;
DROP INDEX IF EXISTS public.idx_users_email_role;

-- Remove unused video indexes
DROP INDEX IF EXISTS public.idx_videos_views;

-- Remove unused user_logins indexes
DROP INDEX IF EXISTS public.idx_user_logins_user_id;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check foreign key coverage
SELECT 
    'Foreign Key Coverage Check' as check_type,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND (indexname LIKE '%created_by%' OR indexname LIKE '%approved_by%')
ORDER BY tablename, indexname;

-- Check remaining indexes
SELECT 
    'Remaining Indexes' as check_type,
    schemaname,
    tablename,
    indexname
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN ('users', 'notifications', 'videos', 'categories', 'user_logins')
ORDER BY tablename, indexname;
