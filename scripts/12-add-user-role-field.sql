-- Add role field to users table to distinguish between Teacher and Student
-- Default existing users to 'Student' role

ALTER TABLE users 
ADD COLUMN role text DEFAULT 'Student' CHECK (role IN ('Teacher', 'Student'));

-- Update existing users to have 'Student' role
UPDATE users 
SET role = 'Student' 
WHERE role IS NULL;

-- Make the role field NOT NULL after setting defaults
ALTER TABLE users 
ALTER COLUMN role SET NOT NULL;
