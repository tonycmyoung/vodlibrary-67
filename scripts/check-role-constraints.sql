-- Check for any constraints on the users.role column
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass 
AND conname LIKE '%role%';

-- Check what role values currently exist in the database
SELECT DISTINCT role, COUNT(*) as count
FROM public.users 
WHERE role IS NOT NULL
GROUP BY role
ORDER BY role;

-- Check if there's a check constraint on the role column specifically
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users' 
AND column_name = 'role';

-- Try to see the table definition
SELECT 
    schemaname,
    tablename,
    tableowner,
    tablespace,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'users';
