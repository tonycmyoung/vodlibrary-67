-- Database Performance Optimization Script
-- Addresses critical performance issues identified in query analysis

-- Removed auth schema indexes that require system privileges
-- Only create indexes on user-owned public tables

-- 1. Optimize public.users table queries
CREATE INDEX IF NOT EXISTS idx_users_role_approved 
ON public.users(role) WHERE is_approved = true;

CREATE INDEX IF NOT EXISTS idx_users_email_role 
ON public.users(email, role);

-- 2. Optimize notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created 
ON public.notifications(recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_sender_created 
ON public.notifications(sender_id, created_at DESC);

-- 3. Update table statistics for better query planning (public tables only)
-- Removed auth schema ANALYZE commands that require system privileges
ANALYZE public.users;
ANALYZE public.notifications;

-- 4. Check for unused indexes (informational query)
-- Fixed column names: tablename -> relname
SELECT 
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes 
WHERE idx_scan = 0 
ORDER BY schemaname, relname;

-- 5. Identify tables that need VACUUM/REINDEX
-- Fixed column names: tablename -> relname
SELECT 
    schemaname,
    relname as tablename,
    n_dead_tup,
    n_live_tup,
    ROUND(n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 2) as dead_tuple_percent
FROM pg_stat_user_tables 
WHERE n_dead_tup > 1000
ORDER BY dead_tuple_percent DESC;

-- 6. Performance monitoring query for ongoing analysis
SELECT 
    query,
    calls,
    total_exec_time as total_time,
    mean_exec_time as mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE calls > 10
ORDER BY total_exec_time DESC 
LIMIT 20;
