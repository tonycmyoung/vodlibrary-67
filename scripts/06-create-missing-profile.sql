-- Create the missing user profile for acmyau@gmail.com
-- This user exists in Supabase auth but is missing from public.users table

INSERT INTO public.users (id, email, full_name, is_approved, created_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', 'Tony Young') as full_name,
    false as is_approved,
    au.created_at
FROM auth.users au
WHERE au.email = 'acmyau@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
);

-- Verify the user was created
SELECT 
    id,
    email,
    full_name,
    is_approved,
    created_at
FROM public.users 
WHERE email = 'acmyau@gmail.com';

-- Show total user count
SELECT COUNT(*) as total_users FROM public.users;
