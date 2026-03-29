-- Migration: 0006_add_curriculums
-- Description: Create curriculums tables for structured curriculum management
-- Created: 2026-03-29

-- Create curriculums table
CREATE TABLE IF NOT EXISTS curriculums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create junction table for many-to-many relationship between videos and curriculums
CREATE TABLE IF NOT EXISTS video_curriculums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  curriculum_id UUID REFERENCES curriculums(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(video_id, curriculum_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_video_curriculums_video_id ON video_curriculums(video_id);
CREATE INDEX IF NOT EXISTS idx_video_curriculums_curriculum_id ON video_curriculums(curriculum_id);
CREATE INDEX IF NOT EXISTS idx_curriculums_name ON curriculums(name);
