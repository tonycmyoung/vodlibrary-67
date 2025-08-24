-- Drop the incorrect function first
DROP FUNCTION IF EXISTS custom_access_token_hook(jsonb, jsonb);

-- Create the correct Custom Access Token Hook function
-- This function takes a single 'event' JSONB parameter containing user_id and claims
CREATE OR REPLACE FUNCTION custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
  claims jsonb;
BEGIN
  -- Extract user_id from the event
  -- Get the user's role from the users table
  SELECT role INTO user_role
  FROM users
  WHERE id = (event->>'user_id')::uuid;
  
  -- Get existing claims from the event
  claims := event->'claims';
  
  -- Add the role to app_metadata
  claims := jsonb_set(
    claims,
    '{app_metadata,role}',
    to_jsonb(COALESCE(user_role, 'Student'))
  );
  
  -- Return the modified claims
  RETURN claims;
END;
$$;

-- Test the function with correct signature
SELECT custom_access_token_hook('{"user_id":"dd6b988e-3414-4beb-848a-f73bb7f23408","claims":{"aud":"authenticated","role":"authenticated"}}');
