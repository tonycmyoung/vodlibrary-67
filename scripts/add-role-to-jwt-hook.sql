-- Replace the test JWT hook with one that adds the user's role
DROP FUNCTION IF EXISTS custom_access_token_hook(jsonb);

CREATE OR REPLACE FUNCTION custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  user_role text;
  claims jsonb;
BEGIN
  -- Get user's role from public.users table
  SELECT role INTO user_role 
  FROM public.users 
  WHERE id = (event->>'user_id');
  
  -- Get existing claims
  claims := event->'claims';
  
  -- Add role to app_metadata (keep existing test field for now)
  claims := jsonb_set(
    claims, 
    '{app_metadata,role}', 
    to_jsonb(COALESCE(user_role, 'User'))
  );
  
  -- Return updated event
  RETURN jsonb_set(event, '{claims}', claims);
EXCEPTION
  WHEN OTHERS THEN
    -- Return original event if any error occurs
    RETURN event;
END;
$$;
