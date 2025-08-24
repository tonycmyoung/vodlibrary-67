-- Fix the specific admin user's role from Student to Admin
-- User ID: dd6b988e-3414-4beb-848a-f73bb7f23408
-- Email: acmyma@gmail.com

-- First, check current role
SELECT id, email, role, is_approved 
FROM users 
WHERE email = 'acmyma@gmail.com';

-- Update the role to Admin
UPDATE users 
SET role = 'Admin'
WHERE email = 'acmyma@gmail.com';

-- Verify the update
SELECT id, email, role, is_approved 
FROM users 
WHERE email = 'acmyma@gmail.com';
