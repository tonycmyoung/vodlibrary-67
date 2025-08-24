-- Remove problematic JWT hook function and create a clean version
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
  -- Extract user_id from event
  extracted_user_id := event->>'user_id';
  
  -- Get user role from public.users table
  SELECT role INTO user_role 
  FROM public.users 
  WHERE id = extracted_user_id;
  
  -- Get existing claims from event
  claims := COALESCE(event->'claims', '{}'::jsonb);
  
  -- Add role to app_metadata
  claims := jsonb_set(
    claims, 
    '{app_metadata,role}', 
    to_jsonb(COALESCE(user_role, 'User'))
  );
  
  -- Return updated event with modified claims
  RETURN jsonb_set(event, '{claims}', claims);
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, return the original event unchanged
    RETURN event;
END;
$$;
