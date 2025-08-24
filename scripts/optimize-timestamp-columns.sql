-- Remove timezone awareness from columns where it's not needed
-- This will eliminate the expensive pg_timezone_names queries

-- Update users table timestamps
ALTER TABLE users 
  ALTER COLUMN created_at TYPE TIMESTAMP,
  ALTER COLUMN updated_at TYPE TIMESTAMP,
  ALTER COLUMN approved_at TYPE TIMESTAMP;

-- Update videos table timestamps  
ALTER TABLE videos
  ALTER COLUMN created_at TYPE TIMESTAMP,
  ALTER COLUMN updated_at TYPE TIMESTAMP;

-- Update categories table timestamps
ALTER TABLE categories
  ALTER COLUMN created_at TYPE TIMESTAMP;

-- Update other tables
ALTER TABLE video_categories ALTER COLUMN created_at TYPE TIMESTAMP;
ALTER TABLE user_favorites ALTER COLUMN created_at TYPE TIMESTAMP;
ALTER TABLE performers ALTER COLUMN created_at TYPE TIMESTAMP;

-- Update the timestamp trigger function to use simple NOW()
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Update default values for new records
ALTER TABLE users ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE videos ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE videos ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE categories ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE video_categories ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE user_favorites ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE performers ALTER COLUMN created_at SET DEFAULT NOW();
