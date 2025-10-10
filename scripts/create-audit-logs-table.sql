-- Create audit_logs table for tracking critical user actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actor_id UUID NOT NULL,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL, -- 'user_signup', 'user_approval', 'user_deletion'
  target_id UUID, -- User ID of the target (for approval/deletion)
  target_email TEXT, -- Email of the target (for approval/deletion)
  additional_data JSONB
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Enable RLS following the project's permissive pattern
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create permissive policy following the established pattern
CREATE POLICY "permissive_audit_logs_policy" ON public.audit_logs
FOR ALL USING ((select auth.uid()) IS NOT NULL) WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Grant permissions to authenticated role
GRANT ALL ON public.audit_logs TO authenticated;
