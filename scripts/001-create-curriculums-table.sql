-- Create curriculums table
CREATE TABLE IF NOT EXISTS curriculums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(name)
);

-- Create index for display_order for fast sorting
CREATE INDEX IF NOT EXISTS idx_curriculums_display_order ON curriculums(display_order);

-- Create index for created_by for reference integrity
CREATE INDEX IF NOT EXISTS idx_curriculums_created_by ON curriculums(created_by);
