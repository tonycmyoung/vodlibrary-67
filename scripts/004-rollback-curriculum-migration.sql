-- ROLLBACK SCRIPT: Use this only if you need to reverse the migration
-- WARNING: This should only be run if something goes wrong with the migration

-- Step 1: Re-insert grade categories back into categories table
INSERT INTO categories (id, name, description, color, created_at, created_by)
SELECT 
  id,
  name,
  description,
  color,
  created_at,
  created_by
FROM curriculums
ON CONFLICT (id) DO NOTHING;

-- Step 2: Restore video_categories associations
INSERT INTO video_categories (video_id, category_id, created_at)
SELECT 
  video_id,
  curriculum_id as category_id,
  created_at
FROM video_curriculums
ON CONFLICT (video_id, category_id) DO NOTHING;

-- Step 3: Drop video_curriculums table
DROP TABLE IF EXISTS video_curriculums;

-- Step 4: Drop curriculums table
DROP TABLE IF EXISTS curriculums;
