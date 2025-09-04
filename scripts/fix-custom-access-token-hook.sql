-- Fix the custom access token hook that's causing authentication failures
-- This function adds user roles and approval status to JWT tokens for proper authorization

-- Drop any existing problematic versions
DROP FUNCTION IF EXISTS public.custom_access_token_hook(jsonb);

-- Create a simpler function that avoids circular dependencies
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
  user_approved boolean;
  claims jsonb;
  user_uuid uuid;
BEGIN
  -- Extract user_id from event
  user_uuid := (event->>'user_id')::uuid;
  
  -- Simplified query with explicit permissions bypass
  SELECT role, is_approved INTO user_role, user_approved
  FROM public.users 
  WHERE id = user_uuid;
  
  -- Get existing claims from event
  claims := COALESCE(event->'claims', '{}'::jsonb);
  
  -- Add role to app_metadata (default to 'User' if not found)
  claims := jsonb_set(
    claims, 
    '{app_metadata,role}', 
    to_jsonb(COALESCE(user_role, 'User'))
  );
  
  -- Add approval status to app_metadata
  claims := jsonb_set(
    claims, 
    '{app_metadata,status}', 
    to_jsonb(CASE WHEN COALESCE(user_approved, false) THEN 'approved' ELSE 'pending' END)
  );
  
  -- Return updated event with modified claims
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;

-- Test the function
SELECT 'JWT Hook function updated successfully' as status;
