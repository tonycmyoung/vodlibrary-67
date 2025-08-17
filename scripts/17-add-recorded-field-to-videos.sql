-- Add 'recorded' field to videos table
ALTER TABLE videos ADD COLUMN recorded text DEFAULT 'Unset';

-- Update existing videos to have 'Unset' as the recorded value
UPDATE videos SET recorded = 'Unset' WHERE recorded IS NULL;
