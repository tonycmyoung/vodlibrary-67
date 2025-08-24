-- Fix admin user role in database
-- Update the admin user's role from 'Student' to 'Admin'

UPDATE users 
SET role = 'Admin', 
    updated_at = NOW()
WHERE email = 'acmyma@gmail.com';

-- Verify the update
SELECT email, role, full_name, is_approved 
FROM users 
WHERE email = 'acmyma@gmail.com';
