-- Add current_belt_id field to users table
ALTER TABLE users
ADD COLUMN current_belt_id UUID REFERENCES curriculums(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_current_belt ON users(current_belt_id);

-- Add comment
COMMENT ON COLUMN users.current_belt_id IS 'Foreign key to curriculums table representing user belt/grade level';
