-- Create trace_logs table for application-wide diagnostic logging
CREATE TABLE IF NOT EXISTS trace_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Source identification
  source_file TEXT NOT NULL,
  source_line INTEGER,
  function_name TEXT,
  
  -- Log categorization
  level TEXT NOT NULL DEFAULT 'info',
  category TEXT,
  
  -- Content
  message TEXT NOT NULL,
  payload JSONB,
  
  -- Context
  user_id UUID,
  user_email TEXT,
  session_id TEXT,
  request_id TEXT,
  
  -- Environment
  environment TEXT DEFAULT 'development',
  user_agent TEXT,
  ip_address TEXT
);

-- Create trace_settings table for configuration
CREATE TABLE IF NOT EXISTS trace_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  enabled BOOLEAN DEFAULT true,
  retention_days INTEGER DEFAULT 7,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO trace_settings (id, enabled, retention_days)
VALUES ('default', true, 7)
ON CONFLICT (id) DO NOTHING;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_trace_logs_created_at ON trace_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trace_logs_level ON trace_logs(level);
CREATE INDEX IF NOT EXISTS idx_trace_logs_category ON trace_logs(category);
CREATE INDEX IF NOT EXISTS idx_trace_logs_source_file ON trace_logs(source_file);

-- Enable Row Level Security
ALTER TABLE trace_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trace_settings ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for trace_logs
CREATE POLICY "Allow all operations on trace_logs"
  ON trace_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create permissive policies for trace_settings
CREATE POLICY "Allow all operations on trace_settings"
  ON trace_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);
