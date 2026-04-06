/**
 * Type definitions for curriculum sets and levels
 * Supports multiple curriculum configurations for different organizations
 */

import type { Video } from "./video"

/**
 * A curriculum set represents a complete grading system for an organization
 * e.g., "Okinawa Kobudo Australia", "Matayoshi International"
 */
export interface CurriculumSet {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  created_by: string | null
  updated_at: string
}

/**
 * A curriculum level represents a grade/belt within a curriculum set
 * e.g., "XX Kyu", "Shodan", "Nidan"
 */
export interface CurriculumLevel {
  id: string
  curriculum_set_id: string
  name: string
  color: string | null
  display_order: number
  description: string | null
  created_at: string
}

/**
 * Curriculum level with associated videos
 */
export interface CurriculumLevelWithVideos extends CurriculumLevel {
  videos: Video[]
  video_count?: number
}

/**
 * Curriculum set with its levels
 */
export interface CurriculumSetWithLevels extends CurriculumSet {
  levels: CurriculumLevel[]
}

/**
 * User's curriculum assignment
 */
export interface UserCurriculumInfo {
  curriculum_set: CurriculumSet | null
  current_level: CurriculumLevel | null
}

/**
 * Form data for creating/updating curriculum sets
 */
export interface CurriculumSetFormData {
  name: string
  description?: string
  is_active?: boolean
}

/**
 * Form data for creating/updating curriculum levels
 */
export interface CurriculumLevelFormData {
  curriculum_set_id: string
  name: string
  color?: string
  display_order: number
  description?: string
}
