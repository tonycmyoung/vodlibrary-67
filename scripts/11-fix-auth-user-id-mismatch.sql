-- Fix the ID mismatch between Supabase auth user and database record
-- Update the database record to use the correct auth user ID

UPDATE users 
SET id = '4b27cefb-eeb6-4bf2-9cbd-77dff0198530'
WHERE email = 'acmyau@gmail.com';

-- Verify the update
SELECT id, email, full_name, is_approved, teacher, school 
FROM users 
WHERE email = 'acmyau@gmail.com';
