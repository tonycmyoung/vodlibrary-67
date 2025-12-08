-- Create video_curriculums junction table
CREATE TABLE IF NOT EXISTS video_curriculums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  curriculum_id UUID REFERENCES curriculums(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  UNIQUE(video_id, curriculum_id)
);

-- Create indexes for foreign keys to improve query performance
CREATE INDEX IF NOT EXISTS idx_video_curriculums_video_id ON video_curriculums(video_id);
CREATE INDEX IF NOT EXISTS idx_video_curriculums_curriculum_id ON video_curriculums(curriculum_id);
