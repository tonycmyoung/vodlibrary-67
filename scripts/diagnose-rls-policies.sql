-- Diagnostic script to check current RLS policy state
-- This will help us understand why our previous scripts didn't work

-- Check all current RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Count policies per table
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC;

-- Check for duplicate policy names
SELECT 
    tablename,
    policyname,
    COUNT(*) as duplicate_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename, policyname
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Check RLS status on tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
