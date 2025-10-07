-- Add 'Head Teacher' to the role constraint
-- This allows users to be assigned the Head Teacher role

-- Check current constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass AND contype = 'c';

-- Drop the existing role constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS user_role_check;

-- Create new constraint that includes 'Head Teacher'
ALTER TABLE users ADD CONSTRAINT user_role_check 
CHECK (role IN ('Student', 'Teacher', 'Head Teacher', 'Admin'));

-- Verify the constraint was updated
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass AND contype = 'c';
