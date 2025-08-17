-- Check all users in the database to see if acmyau@gmail.com exists
SELECT 
    id,
    email,
    full_name,
    is_approved,
    created_at,
    approved_at
FROM users
ORDER BY created_at DESC;

-- Also check if there are any auth users that might not have corresponding profile records
-- This requires checking the auth.users table (if accessible)
-- Note: This might not work if we don't have access to auth schema
SELECT 
    COUNT(*) as total_users_in_public_table
FROM users;

-- Check specifically for the test user
SELECT 
    id,
    email,
    full_name,
    is_approved,
    created_at
FROM users 
WHERE email = 'acmyau@gmail.com';
