-- Migrate grade categories (those starting with numbers) to curriculums table
-- Step 1: Insert grade categories into curriculums table with display_order based on natural sort
INSERT INTO curriculums (id, name, description, color, display_order, created_at, created_by)
SELECT 
  id,
  name,
  description,
  color,
  -- Use ROW_NUMBER() to assign display_order based on natural numeric sorting
  ROW_NUMBER() OVER (ORDER BY 
    -- Extract leading number for proper numeric sorting (e.g., "10th" comes after "9th")
    CAST(SUBSTRING(name FROM '^\d+') AS INTEGER),
    name
  ) as display_order,
  created_at,
  created_by
FROM categories
WHERE name ~ '^\d'  -- PostgreSQL regex: categories starting with a digit
ON CONFLICT (id) DO NOTHING;

-- Step 2: Copy video-category associations for grade categories to video_curriculums
INSERT INTO video_curriculums (video_id, curriculum_id, created_at)
SELECT 
  vc.video_id,
  vc.category_id as curriculum_id,  -- The category_id becomes curriculum_id
  vc.created_at
FROM video_categories vc
INNER JOIN categories c ON vc.category_id = c.id
WHERE c.name ~ '^\d'  -- Only grade categories
ON CONFLICT (video_id, curriculum_id) DO NOTHING;

-- Step 3: Delete video_categories associations for grade categories
-- DELETE FROM video_categories
-- WHERE category_id IN (
--   SELECT id FROM categories WHERE name ~ '^\d'
--);

-- Step 4: Delete grade categories from categories table
-- DELETE FROM categories WHERE name ~ '^\d';
