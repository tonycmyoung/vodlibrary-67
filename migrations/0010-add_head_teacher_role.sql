-- Migration: 0010_add_head_teacher_role
-- Description: Add head_teacher role option and update role constraint
-- Created: 2026-03-29

-- Update role constraint to include 'head_teacher'
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('Teacher', 'Student', 'head_teacher'));
