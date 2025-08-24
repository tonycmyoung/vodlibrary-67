DROP FUNCTION IF EXISTS custom_access_token_hook(jsonb);

CREATE OR REPLACE FUNCTION custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  user_uuid text;
  user_role text;
  claims jsonb;
BEGIN
  -- Extract user_id from event
  user_uuid := event->>'user_id';
  
  -- Try to find user role in public.users table
  SELECT role INTO user_role 
  FROM public.users 
  WHERE id = user_uuid;
  
  -- Get existing claims
  claims := event->'claims';
  
  -- Add diagnostic info to app_metadata
  claims := jsonb_set(
    claims, 
    '{app_metadata,extracted_user_id}', 
    to_jsonb(user_uuid)
  );
  
  claims := jsonb_set(
    claims, 
    '{app_metadata,found_role}', 
    to_jsonb(COALESCE(user_role, 'NOT_FOUND'))
  );
  
  claims := jsonb_set(
    claims, 
    '{app_metadata,test}', 
    to_jsonb('hook_working')
  );
  
  -- Return updated event
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;
