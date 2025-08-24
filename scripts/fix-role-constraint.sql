-- Check current constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass AND contype = 'c';

-- Drop the existing role constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS user_role_check;

-- Create new constraint that includes 'Admin'
ALTER TABLE users ADD CONSTRAINT user_role_check 
CHECK (role IN ('Student', 'Teacher', 'Instructor', 'Admin'));

-- Now update the admin user's role
UPDATE users 
SET role = 'Admin' 
WHERE email = 'acmyma@gmail.com';

-- Verify the update worked
SELECT id, email, role, is_approved 
FROM users 
WHERE email = 'acmyma@gmail.com';
