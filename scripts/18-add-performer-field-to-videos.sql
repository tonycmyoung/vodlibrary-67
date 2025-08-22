-- Updated field name from 'performer' to 'performers' to support multiple performers
-- Add 'performers' field to videos table
ALTER TABLE videos ADD COLUMN performers text DEFAULT 'Unset';

-- Update existing videos to have 'Unset' as the performers value
UPDATE videos SET performers = 'Unset' WHERE performers IS NULL;
