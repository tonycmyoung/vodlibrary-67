-- Add is_client column to trace_logs to indicate client vs server origin
ALTER TABLE trace_logs 
ADD COLUMN IF NOT EXISTS is_client BOOLEAN DEFAULT false;

-- Create index for filtering by origin
CREATE INDEX IF NOT EXISTS idx_trace_logs_is_client ON trace_logs(is_client);
