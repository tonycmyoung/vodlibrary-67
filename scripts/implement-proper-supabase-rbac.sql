-- Complete Supabase RBAC implementation based on official documentation

-- Step 1: Grant supabase_auth_admin access to users table (this was the missing piece!)
GRANT SELECT ON public.users TO supabase_auth_admin;

-- Step 2: Create RLS policy to allow auth admin to read user roles
CREATE POLICY "Allow auth admin to read user roles" ON public.users
FOR SELECT TO supabase_auth_admin
USING (true);

-- Step 3: Create the proper JWT hook function
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  user_role text;
  claims jsonb;
BEGIN
  -- Extract user_id from event
  -- Fixed type casting issue by ensuring both sides are text
  SELECT role INTO user_role 
  FROM public.users 
  WHERE id::text = (event->>'user_id')::text;
  
  -- Get existing claims
  claims := event->'claims';
  
  -- Add user_role to claims (not app_metadata)
  claims := jsonb_set(
    claims, 
    '{user_role}', 
    to_jsonb(COALESCE(user_role, 'User'))
  );
  
  -- Return updated event
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Step 4: Create authorize function for RLS policies
CREATE OR REPLACE FUNCTION public.authorize(requested_permission text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get user role from JWT
  user_role := (SELECT auth.jwt() ->> 'user_role');
  
  -- Admin role has all permissions
  IF user_role = 'Admin' THEN
    RETURN true;
  END IF;
  
  -- For now, only Admin role is supported
  -- You can extend this with a role_permissions table later
  RETURN false;
END;
$$;

-- Step 5: Update users table RLS policy to use authorize function
DROP POLICY IF EXISTS "users_select_admin_and_self" ON public.users;

CREATE POLICY "users_select_authorized" ON public.users
FOR SELECT TO authenticated
USING (
  -- Fixed type casting for auth.uid() comparison
  (id::text = (SELECT auth.uid()::text)) OR 
  (SELECT authorize('users.read'))
);

-- Grant execute permission on authorize function
GRANT EXECUTE ON FUNCTION public.authorize(text) TO authenticated;

-- Verify the setup
SELECT 'RBAC setup complete' as status;
