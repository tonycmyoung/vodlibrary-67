-- Migration: Curriculum Sets Refactor
-- Purpose: Enable multiple curriculum sets for international organizations
-- Each curriculum set contains levels (existing curriculums table rows)
-- Videos can belong to levels across multiple sets

-- =====================================================
-- STEP 1: Create curriculum_sets table
-- =====================================================
CREATE TABLE IF NOT EXISTS curriculum_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS with permissive policy (matches existing pattern)
ALTER TABLE curriculum_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY permissive_curriculum_sets_policy ON curriculum_sets
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- STEP 2: Add curriculum_set_id to curriculums table
-- (curriculums table now represents "levels within a set")
-- =====================================================
ALTER TABLE curriculums 
  ADD COLUMN IF NOT EXISTS curriculum_set_id UUID REFERENCES curriculum_sets(id);

-- =====================================================
-- STEP 3: Add curriculum_set_id to users table
-- (user's assigned curriculum set)
-- =====================================================
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS curriculum_set_id UUID REFERENCES curriculum_sets(id);

-- =====================================================
-- STEP 4: Create indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_curriculums_set ON curriculums(curriculum_set_id);
CREATE INDEX IF NOT EXISTS idx_users_curriculum_set ON users(curriculum_set_id);

-- =====================================================
-- STEP 5: Create "Okinawa Kobudo Australia" curriculum set
-- and migrate existing data
-- =====================================================

-- Create the default curriculum set
INSERT INTO curriculum_sets (name, description, is_active)
VALUES (
  'Okinawa Kobudo Australia',
  'Traditional Okinawa Kobudo curriculum for Australian students and affiliated schools',
  true
)
ON CONFLICT (name) DO NOTHING;

-- Assign all existing curriculum levels to this set
UPDATE curriculums 
SET curriculum_set_id = (SELECT id FROM curriculum_sets WHERE name = 'Okinawa Kobudo Australia')
WHERE curriculum_set_id IS NULL;

-- Assign all existing users to this curriculum set
UPDATE users 
SET curriculum_set_id = (SELECT id FROM curriculum_sets WHERE name = 'Okinawa Kobudo Australia')
WHERE curriculum_set_id IS NULL;

-- =====================================================
-- STEP 6: After verification, make curriculum_set_id NOT NULL
-- (Run this manually after confirming migration success)
-- =====================================================
-- ALTER TABLE curriculums ALTER COLUMN curriculum_set_id SET NOT NULL;

-- =====================================================
-- VERIFICATION QUERIES (run manually to verify)
-- =====================================================
-- SELECT * FROM curriculum_sets;
-- SELECT name, curriculum_set_id FROM curriculums;
-- SELECT COUNT(*) FROM users WHERE curriculum_set_id IS NOT NULL;
