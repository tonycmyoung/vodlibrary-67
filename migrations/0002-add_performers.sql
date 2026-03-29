-- Migration: 0002_add_performers
-- Description: Create performers tables for structured performer management
-- Created: 2026-03-29

-- Create performers table for structured performer management
CREATE TABLE IF NOT EXISTS performers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create junction table for many-to-many relationship between videos and performers
CREATE TABLE IF NOT EXISTS video_performers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  performer_id UUID REFERENCES performers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(video_id, performer_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_video_performers_video_id ON video_performers(video_id);
CREATE INDEX IF NOT EXISTS idx_video_performers_performer_id ON video_performers(performer_id);
CREATE INDEX IF NOT EXISTS idx_performers_name ON performers(name);
