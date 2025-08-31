-- Fix Function Search Path Mutable security warnings
-- Setting explicit search_path prevents SQL injection attacks

-- Fix update_updated_at_column function search_path
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';

-- Fix custom_access_token_hook function search_path  
ALTER FUNCTION public.custom_access_token_hook(jsonb) SET search_path = '';

-- Fix authorize function search_path
ALTER FUNCTION public.authorize(text) SET search_path = '';

-- Verify the changes
SELECT 
    routine_name,
    routine_type,
    security_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('update_updated_at_column', 'custom_access_token_hook', 'authorize');
