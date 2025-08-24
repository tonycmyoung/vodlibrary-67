SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'authorize' 
    AND routine_schema = 'public';

-- Also check what tables exist for role management
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name LIKE '%role%' 
    OR table_name LIKE '%permission%';
