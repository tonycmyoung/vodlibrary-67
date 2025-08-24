-- Check all users in the database and their approval status
SELECT 
    id,
    email,
    full_name,
    role,
    is_approved,
    created_at
FROM users
ORDER BY created_at DESC;

-- Specifically check for the acmyau user
SELECT 
    id,
    email,
    full_name,
    role,
    is_approved,
    created_at
FROM users 
WHERE email = 'acmyau@gmail.com';

-- Check users that should appear in dropdown (approved, not admin)
SELECT 
    id,
    email,
    full_name,
    role,
    is_approved
FROM users 
WHERE is_approved = true 
AND email != 'acmyma@gmail.com';
