-- Fix search_path security issue for update_updated_at_column function
-- This addresses the Supabase Security Advisor warning about mutable search_path

-- Drop and recreate the function with proper security settings
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Recreate the function with fixed search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Ensure the function is owned by the service role for security
-- Note: This function is typically used in triggers to automatically update timestamps
