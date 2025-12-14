import "@testing-library/jest-dom"
import { afterEach, vi } from "vitest"
import { cleanup } from "@testing-library/react"

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Next.js modules
vi.mock("next/navigation", () => require("./mocks/next-navigation"))

// Mock Supabase - will be customized per test
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}))

// Set default test environment variables (optional, with defaults)
const testEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
}

// Only set if not already defined
Object.entries(testEnv).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = value
  }
})
