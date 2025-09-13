-- Create user_consents table to track legal agreement acceptance
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  eula_accepted_at TIMESTAMP WITH TIME ZONE,
  privacy_accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);

-- Add RLS policies
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- Simplified to use permissive RLS policy pattern
-- Simple permissive policy for all operations
CREATE POLICY "permissive_user_consents_policy" ON user_consents
  FOR ALL USING (( SELECT auth.uid() AS uid) IS NOT NULL);
