-- Drop and recreate the JWT hook function with better debugging and role lookup
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
  
  -- Get role from public.users table using UUID comparison
  SELECT p.role INTO user_role 
  FROM public.users p
  WHERE p.id::text = user_uuid::text;
  
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
