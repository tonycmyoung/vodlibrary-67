import { render, type RenderOptions } from "@testing-library/react"
import type { ReactElement } from "react"

/**
 * Custom render function that wraps components with common providers
 */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { ...options })
}

/**
 * Helper to create mock user data for tests
 */
export const createMockUser = (overrides = {}) => ({
  id: "test-user-id",
  email: "test@example.com",
  full_name: "Test User",
  role: "student",
  current_belt: 5,
  created_at: new Date().toISOString(),
  ...overrides,
})

/**
 * Helper to create mock video data for tests
 */
export const createMockVideo = (overrides = {}) => ({
  id: "test-video-id",
  title: "Test Video",
  description: "Test Description",
  video_url: "https://example.com/video.mp4",
  thumbnail_url: "https://example.com/thumb.jpg",
  duration: 120,
  categories: [],
  curriculums: [],
  performers: [],
  created_at: new Date().toISOString(),
  ...overrides,
})

/**
 * Helper to create mock curriculum data for tests
 */
export const createMockCurriculum = (overrides = {}) => ({
  id: "test-curriculum-id",
  name: "Test Belt",
  display_order: 1,
  created_at: new Date().toISOString(),
  ...overrides,
})
