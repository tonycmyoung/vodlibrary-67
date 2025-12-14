import { vi } from "vitest"

/**
 * Mock Next.js navigation hooks for testing
 */
export const mockUseRouter = () => ({
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  pathname: "/",
  query: {},
  asPath: "/",
})

export const mockUsePathname = vi.fn(() => "/")
export const mockUseSearchParams = vi.fn(() => new URLSearchParams())
export const mockUseParams = vi.fn(() => ({}))

/**
 * Setup all navigation mocks
 */
export const setupNavigationMocks = () => {
  vi.mock("next/navigation", () => ({
    useRouter: mockUseRouter,
    usePathname: mockUsePathname,
    useSearchParams: mockUseSearchParams,
    useParams: mockUseParams,
  }))
}
