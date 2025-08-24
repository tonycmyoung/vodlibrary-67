-- Test JWT hook function to verify user_id extraction
DROP FUNCTION IF EXISTS custom_access_token_hook(jsonb);

CREATE OR REPLACE FUNCTION custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  claims jsonb;
  extracted_user_id text;
BEGIN
  -- Get existing claims
  claims := event->'claims';
  
  -- Extract user_id from event for testing
  extracted_user_id := event->>'user_id';
  
  -- Add test fields to verify extraction
  claims := jsonb_set(claims, '{app_metadata,test}', '"hook_working"');
  claims := jsonb_set(claims, '{app_metadata,extracted_user_id}', to_jsonb(extracted_user_id));
  claims := jsonb_set(claims, '{app_metadata,raw_event}', event);
  
  -- Return updated event
  RETURN jsonb_set(event, '{claims}', claims);
EXCEPTION
  WHEN OTHERS THEN
    -- Return original event if any error occurs
    RETURN event;
END;
$$;
