-- Fix Performance Advisor warning: Auth RLS Initialization Plan
-- Replace auth.<function>() with (select auth.<function>()) in RLS policies

-- Drop and recreate the users_select_authorized policy with optimized auth function call
DROP POLICY IF EXISTS users_select_authorized ON public.users;

CREATE POLICY users_select_authorized ON public.users
FOR SELECT
USING (
  -- Wrap authorize() in SELECT subquery to prevent re-evaluation per row
  (SELECT authorize('users.read'))
);
