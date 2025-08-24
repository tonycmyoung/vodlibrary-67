-- Debug the JWT hook function to see why user lookup is failing
-- This will help identify if user_id extraction or database lookup is the issue

-- Test 1: Check what user_id we're extracting from the event
SELECT 
  'Test 1: User ID extraction' as test_name,
  (event->>'user_id') as extracted_user_id,
  (event->>'user_id')::uuid as converted_uuid
FROM (
  SELECT '{"user_id":"dd6b988e-3414-4beb-848a-f73bb7f23408","claims":{"app_metadata":{}}}'::jsonb as event
) t;

-- Test 2: Check if the user exists in public.users with that ID
SELECT 
  'Test 2: User lookup in public.users' as test_name,
  id,
  email,
  role,
  is_approved
FROM public.users 
WHERE id = 'dd6b988e-3414-4beb-848a-f73bb7f23408';

-- Test 3: Check if the user exists in auth.users
SELECT 
  'Test 3: User lookup in auth.users' as test_name,
  id,
  email,
  role
FROM auth.users 
WHERE id = 'dd6b988e-3414-4beb-848a-f73bb7f23408'::uuid;

-- Fixed type casting to ensure both sides are text
-- Test 4: Test the actual JOIN that the JWT hook function uses
SELECT 
  'Test 4: JOIN between auth.users and public.users' as test_name,
  au.id as auth_id,
  au.email as auth_email,
  pu.id as public_id,
  pu.email as public_email,
  pu.role as public_role
FROM auth.users au
JOIN public.users pu ON au.id::text = pu.id::text
WHERE au.id = 'dd6b988e-3414-4beb-848a-f73bb7f23408'::uuid;

-- Test 5: Simulate the exact query the JWT hook function uses
DO $$
DECLARE
  user_role text;
  test_event jsonb := '{"user_id":"dd6b988e-3414-4beb-848a-f73bb7f23408","claims":{"app_metadata":{}}}';
BEGIN
  -- Fixed type casting in JOIN condition
  -- Extract user_id and lookup role exactly like the JWT hook function
  SELECT pu.role INTO user_role 
  FROM auth.users au
  JOIN public.users pu ON au.id::text = pu.id::text
  WHERE au.id = (test_event->>'user_id')::uuid;
  
  RAISE NOTICE 'Test 5: JWT hook simulation - Found role: %', COALESCE(user_role, 'NULL (not found)');
END $$;
