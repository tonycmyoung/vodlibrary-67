-- Create a Custom Access Token Hook to add user role to JWT metadata
-- This maintains JWT-based RLS performance while enabling admin access

-- Create the hook function
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_role text;
BEGIN
  -- Get the claims from the event
  claims := event->'claims';
  
  -- Get the user's role from the users table
  SELECT role INTO user_role
  FROM public.users
  WHERE id = (event->>'user_id')::uuid;
  
  -- Add the role to app_metadata
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(
      claims,
      '{app_metadata,role}',
      to_jsonb(user_role)
    );
  END IF;
  
  -- Return the modified event
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT SELECT ON public.users TO supabase_auth_admin;

-- Instructions for manual setup:
-- 1. Go to Supabase Dashboard → Authentication → Hooks (Beta)
-- 2. Select "Custom Access Token" hook type
-- 3. Choose the function: public.custom_access_token_hook
-- 4. Enable the hook
-- 5. Users will need to log out and back in for the JWT to include the role
