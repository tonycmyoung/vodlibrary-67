-- Fix admin user role in database
-- Update the admin user's role from 'Student' to 'Admin'

UPDATE users 
SET role = 'Admin', 
    updated_at = NOW()
WHERE email = 'admin@example.com';

-- Verify the update
SELECT email, role, full_name, is_approved 
FROM users 
WHERE email = 'admin@example.com';
