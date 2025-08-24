-- Test JWT hook function to verify it's being called
DROP FUNCTION IF EXISTS custom_access_token_hook(jsonb);

CREATE OR REPLACE FUNCTION custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  claims jsonb;
BEGIN
  -- Get existing claims
  claims := event->'claims';
  
  -- Add a simple test field to verify the hook is working
  claims := jsonb_set(
    claims, 
    '{app_metadata,test}', 
    '"hook_working"'
  );
  
  -- Return updated event
  RETURN jsonb_set(event, '{claims}', claims);
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, return original event to prevent login failure
    RETURN event;
END;
$$;
