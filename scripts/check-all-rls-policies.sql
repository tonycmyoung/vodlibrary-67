-- Check all RLS policies across all tables to identify which ones need updating
-- to use the new authorize() function instead of old JWT app_metadata approach

-- Check all policies that might still use the old JWT app_metadata pattern
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
AND (
    qual LIKE '%app_metadata%' 
    OR with_check LIKE '%app_metadata%'
    OR qual LIKE '%auth.jwt()%'
    OR with_check LIKE '%auth.jwt()%'
)
ORDER BY tablename, policyname;

-- Also check for any policies that might need the authorize() function
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
