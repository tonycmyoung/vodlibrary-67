-- Migration: Fix Curriculum Name Uniqueness
-- Purpose: Change unique constraint on curriculums.name from global to per-set
-- The name should only need to be unique within a curriculum_set, not globally

-- Drop the old global unique constraint on name
ALTER TABLE curriculums DROP CONSTRAINT IF EXISTS curriculums_name_key;

-- Drop the index that was backing the unique constraint (if it exists separately)
DROP INDEX IF EXISTS idx_curriculums_name;

-- Create new composite unique constraint (name unique within each set)
ALTER TABLE curriculums ADD CONSTRAINT curriculums_set_name_unique UNIQUE (curriculum_set_id, name);

-- Create index on the new composite key for better query performance
CREATE INDEX IF NOT EXISTS idx_curriculums_set_name ON curriculums(curriculum_set_id, name);
