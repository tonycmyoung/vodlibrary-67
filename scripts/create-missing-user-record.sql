-- Create missing user record for acmyau@gmail.com
-- This user exists in Auth but is missing from public.users table

INSERT INTO public.users (
    id,
    email,
    full_name,
    teacher,
    school,
    role,
    is_approved,
    created_at,
    updated_at
) VALUES (
    '92550655-7b39-4b2e-99c8-40b2c1256873',
    'acmyau@gmail.com',
    'Tony Young',
    'Master Young',
    'TY Kobudo',
    'Teacher',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    teacher = EXCLUDED.teacher,
    school = EXCLUDED.school,
    role = EXCLUDED.role,
    is_approved = EXCLUDED.is_approved,
    updated_at = NOW();

-- Verify the user was created
SELECT 
    id,
    email,
    full_name,
    role,
    is_approved,
    created_at
FROM public.users 
WHERE email = 'acmyau@gmail.com';
