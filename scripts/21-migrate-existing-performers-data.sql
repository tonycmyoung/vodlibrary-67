-- Migrate existing performer data from text field to structured system
-- This script handles comma-separated performer names in the existing performers column

-- Insert unique performers from existing data
INSERT INTO performers (name)
SELECT DISTINCT TRIM(performer_name)
FROM (
  SELECT UNNEST(string_to_array(performers, ',')) AS performer_name
  FROM videos
  WHERE performers IS NOT NULL 
    AND performers != '' 
    AND performers != 'Unset'
) AS split_performers
WHERE TRIM(performer_name) != ''
ON CONFLICT (name) DO NOTHING;

-- Create video-performer relationships
INSERT INTO video_performers (video_id, performer_id)
SELECT DISTINCT v.id, p.id
FROM videos v
CROSS JOIN LATERAL (
  SELECT UNNEST(string_to_array(v.performers, ',')) AS performer_name
) AS split
JOIN performers p ON p.name = TRIM(split.performer_name)
WHERE v.performers IS NOT NULL 
  AND v.performers != '' 
  AND v.performers != 'Unset'
  AND TRIM(split.performer_name) != ''
ON CONFLICT (video_id, performer_id) DO NOTHING;

-- Remove the old performers column from videos table
ALTER TABLE videos DROP COLUMN performers;
