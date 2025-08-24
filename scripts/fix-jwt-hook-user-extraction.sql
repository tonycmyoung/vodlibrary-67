-- Fix JWT hook function to properly extract user_id from event
DROP FUNCTION IF EXISTS custom_access_token_hook(jsonb);

CREATE OR REPLACE FUNCTION custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  user_role text;
  claims jsonb;
  extracted_user_id text;
BEGIN
  -- Extract user_id from event.user_id instead of nested structure
  extracted_user_id := event->>'user_id';
  
  -- Debug: Log the extracted user_id (remove after testing)
  RAISE LOG 'JWT Hook - Extracted user_id: %', extracted_user_id;
  
  -- Get user role from public.users table using direct text comparison
  SELECT role INTO user_role 
  FROM public.users 
  WHERE id = extracted_user_id;
  
  -- Debug: Log the found role (remove after testing)
  RAISE LOG 'JWT Hook - Found role: %', COALESCE(user_role, 'NULL');
  
  -- Get existing claims from event
  claims := COALESCE(event->'claims', '{}'::jsonb);
  
  -- Add role to app_metadata, defaulting to 'User' if not found
  claims := jsonb_set(
    claims, 
    '{app_metadata,role}', 
    to_jsonb(COALESCE(user_role, 'User'))
  );
  
  -- Return updated event with modified claims
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;
