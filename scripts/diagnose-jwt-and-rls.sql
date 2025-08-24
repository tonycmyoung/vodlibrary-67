-- Check what the JWT actually contains for the current user
SELECT 
  'Current JWT contents:' as info,
  auth.jwt() as jwt_full,
  (auth.jwt() -> 'app_metadata') as app_metadata,
  (auth.jwt() -> 'app_metadata' ->> 'role') as role_from_jwt,
  auth.uid() as current_user_id;

-- Test the RLS condition directly
SELECT 
  'RLS condition test:' as info,
  (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'Admin'::text) as is_admin_by_rls;

-- Check what users the current session can see
SELECT 
  'Users visible to current session:' as info,
  id, email, role, is_approved
FROM users;

-- Check if there are multiple SELECT policies conflicting
SELECT 
  schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'SELECT';
