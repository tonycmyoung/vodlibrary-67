-- Add teacher and school fields to users table
ALTER TABLE public.users 
ADD COLUMN teacher text,
ADD COLUMN school text;

-- Update existing users to have empty values for the new fields
UPDATE public.users 
SET teacher = '', school = '' 
WHERE teacher IS NULL OR school IS NULL;

-- Verify the changes
SELECT id, email, full_name, teacher, school, is_approved 
FROM public.users;
