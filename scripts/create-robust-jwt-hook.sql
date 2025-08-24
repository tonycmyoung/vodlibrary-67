-- Drop and recreate the JWT hook function with better error handling and debugging
DROP FUNCTION IF EXISTS custom_access_token_hook(jsonb);

CREATE OR REPLACE FUNCTION custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  user_role text;
  claims jsonb;
  user_uuid uuid;
BEGIN
  -- Extract user_id from event and convert to UUID
  user_uuid := (event->>'user_id')::uuid;
  
  -- Look up user role from public.users table
  SELECT role INTO user_role 
  FROM public.users 
  WHERE id = user_uuid::text;
  
  -- Get existing claims
  claims := event->'claims';
  
  -- Add role to app_metadata (default to 'User' if not found)
  claims := jsonb_set(
    claims, 
    '{app_metadata,role}', 
    to_jsonb(COALESCE(user_role, 'User'))
  );
  
  -- Return updated event
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION custom_access_token_hook TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- Test the function with the admin user ID
SELECT custom_access_token_hook('{"user_id":"dd6b988e-3414-4beb-848a-f73bb7f23408","claims":{"app_metadata":{}}}');
