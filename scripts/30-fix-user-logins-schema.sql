-- Add missing created_at column to user_logins table
ALTER TABLE user_logins 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
