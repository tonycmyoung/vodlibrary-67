-- Drop the existing function and recreate with correct parameter types
DROP FUNCTION IF EXISTS custom_access_token_hook(jsonb, jsonb);

-- Create the JWT hook function with proper parameter types
CREATE OR REPLACE FUNCTION custom_access_token_hook(event jsonb, session jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_role text;
BEGIN
  -- Get existing claims from the event
  claims := event->'claims';
  
  -- Get user role from the users table
  SELECT role INTO user_role
  FROM auth.users au
  JOIN public.users pu ON au.id = pu.id
  WHERE au.id = (session->>'user_id')::uuid;
  
  -- Add role to app_metadata
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(
      claims,
      '{app_metadata,role}',
      to_jsonb(user_role)
    );
  END IF;
  
  -- Return the modified event with updated claims
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION custom_access_token_hook(jsonb, jsonb) TO supabase_auth_admin;

-- Test the function with proper types
SELECT custom_access_token_hook(
  '{"claims":{"aud":"authenticated","role":"authenticated"}}'::jsonb,
  '{"user_id":"dd6b988e-3414-4beb-848a-f73bb7f23408"}'::jsonb
);
