/**
 * Shared type definitions for video-related components
 * Extracted from video-library.tsx to enable reuse across components
 */

export interface Video {
  id: string
  title: string
  description: string | null
  video_url: string
  thumbnail_url: string | null
  duration_seconds: number | null
  created_at: string
  recorded: string | null
  views: number | null
  categories: Category[]
  curriculums: Curriculum[]
  performers: Performer[]
}

export interface Category {
  id: string
  name: string
  color: string
  description: string | null
}

export interface Curriculum {
  id: string
  name: string
  color: string
  display_order: number
  description: string | null
}

export interface Performer {
  id: string
  name: string
}

export type FilterMode = "AND" | "OR"

export type ViewMode = "grid" | "list"
