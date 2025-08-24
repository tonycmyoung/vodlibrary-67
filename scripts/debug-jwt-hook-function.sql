-- Debug the JWT hook function to see why it's not finding the correct role
SELECT 'Testing JWT hook function directly:' as debug_step;

-- Test 1: Check if we can find the admin user in public.users
SELECT 'Admin user in public.users:' as test, id, email, role, is_approved 
FROM public.users 
WHERE id = 'dd6b988e-3414-4beb-848a-f73bb7f23408';

-- Test 2: Check if we can find the admin user in auth.users
SELECT 'Admin user in auth.users:' as test, id, email 
FROM auth.users 
WHERE id = 'dd6b988e-3414-4beb-848a-f73bb7f23408'::uuid;

-- Test 3: Test the JOIN between auth.users and public.users
SELECT 'JOIN test:' as test, u.id as auth_id, p.id as public_id, p.role, p.email
FROM auth.users u
JOIN public.users p ON u.id::text = p.id::text
WHERE u.id = 'dd6b988e-3414-4beb-848a-f73bb7f23408'::uuid;

-- Test 4: Test the JWT hook function with admin user
SELECT 'JWT hook function test:' as test, 
custom_access_token_hook('{"user_id":"dd6b988e-3414-4beb-848a-f73bb7f23408","claims":{"app_metadata":{}}}');

-- Test 5: Check all users in public.users to see if acmyau exists
SELECT 'All users in public.users:' as test, id, email, role, is_approved 
FROM public.users 
ORDER BY email;
