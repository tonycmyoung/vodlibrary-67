-- Check the approval status of acmyau@gmail.com user
SELECT 
    id,
    email,
    full_name,
    teacher,
    school,
    is_approved,
    approved_by,
    approved_at,
    created_at
FROM users 
WHERE email = 'acmyau@gmail.com';

-- Also check if there are any other users for comparison
SELECT 
    email,
    full_name,
    is_approved,
    approved_at
FROM users 
ORDER BY created_at DESC;
