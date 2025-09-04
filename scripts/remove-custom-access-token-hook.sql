-- Remove the custom access token hook that's causing login failures
-- Since we removed RLS entirely, we no longer need JWT claims

-- Drop the custom access token hook function
DROP FUNCTION IF EXISTS public.custom_access_token_hook(event jsonb);

-- Note: You'll also need to remove the hook configuration in Supabase Dashboard:
-- Go to Authentication > Hooks and remove the custom access token hook
