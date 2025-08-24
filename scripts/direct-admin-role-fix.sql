-- Direct fix for admin user role issue
-- This script will update the specific user's role to Admin

-- First, let's see what roles exist in the system
SELECT DISTINCT role FROM users WHERE role IS NOT NULL;

-- Update the specific admin user by ID (from debug logs)
UPDATE users 
SET role = 'Admin'
WHERE id = 'dd6b988e-3414-4beb-848a-f73bb7f23408';

-- Verify the update worked
SELECT id, email, role, is_approved 
FROM users 
WHERE id = 'dd6b988e-3414-4beb-848a-f73bb7f23408';

-- Also check if there are any other users with Admin role
SELECT id, email, role, is_approved 
FROM users 
WHERE role = 'Admin';
