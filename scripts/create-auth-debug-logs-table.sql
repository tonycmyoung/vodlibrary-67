-- Create auth_debug_logs table for debugging authentication issues
CREATE TABLE IF NOT EXISTS auth_debug_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  event_type TEXT NOT NULL, -- 'login_attempt', 'signup', 'email_confirmation', 'approval'
  user_email TEXT,
  user_id UUID,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  error_code TEXT,
  additional_data JSONB,
  ip_address TEXT,
  user_agent TEXT
);

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_auth_debug_logs_created_at ON auth_debug_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_debug_logs_user_email ON auth_debug_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_auth_debug_logs_event_type ON auth_debug_logs(event_type);

-- Enable RLS following the project's permissive pattern
ALTER TABLE public.auth_debug_logs ENABLE ROW LEVEL SECURITY;

-- Create permissive policy following the established pattern
CREATE POLICY "permissive_auth_debug_logs_policy" ON public.auth_debug_logs
FOR ALL USING ((select auth.uid()) IS NOT NULL) WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Grant permissions to authenticated role
GRANT ALL ON public.auth_debug_logs TO authenticated;
