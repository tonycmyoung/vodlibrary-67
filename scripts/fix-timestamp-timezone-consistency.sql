-- Fix timezone inconsistency between users table and user_consents table
-- Convert user_consents table to use TIMESTAMP (without timezone) to match users table
-- This ensures consistent display formatting across all timestamp fields

-- Update user_consents table to remove timezone awareness
ALTER TABLE user_consents 
  ALTER COLUMN eula_accepted_at TYPE TIMESTAMP,
  ALTER COLUMN privacy_accepted_at TYPE TIMESTAMP,
  ALTER COLUMN created_at TYPE TIMESTAMP,
  ALTER COLUMN updated_at TYPE TIMESTAMP;

-- Update default values to use simple NOW() (without timezone)
ALTER TABLE user_consents ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE user_consents ALTER COLUMN updated_at SET DEFAULT NOW();

-- Verify the changes
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name IN ('users', 'user_consents') 
  AND column_name LIKE '%_at'
ORDER BY table_name, column_name;
