import { vi } from "vitest"

/**
 * Mock Supabase client for testing
 * Returns chainable methods that can be configured per test
 */
export const createMockSupabaseClient = () => {
  const mockSelect = vi.fn().mockReturnThis()
  const mockInsert = vi.fn().mockReturnThis()
  const mockUpdate = vi.fn().mockReturnThis()
  const mockDelete = vi.fn().mockReturnThis()
  const mockEq = vi.fn().mockReturnThis()
  const mockGt = vi.fn().mockReturnThis()
  const mockLt = vi.fn().mockReturnThis()
  const mockGte = vi.fn().mockReturnThis()
  const mockLte = vi.fn().mockReturnThis()
  const mockIn = vi.fn().mockReturnThis()
  const mockOrder = vi.fn().mockReturnThis()
  const mockLimit = vi.fn().mockReturnThis()
  const mockSingle = vi.fn()
  const mockMaybeSingle = vi.fn()
  const mockRange = vi.fn().mockReturnThis()

  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    gt: mockGt,
    lt: mockLt,
    gte: mockGte,
    lte: mockLte,
    in: mockIn,
    order: mockOrder,
    limit: mockLimit,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    range: mockRange,
  }))

  const mockAuth = {
    getUser: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    signInWithPassword: vi.fn(),
    updateUser: vi.fn(),
  }

  const mockStorage = {
    from: vi.fn(() => ({
      upload: vi.fn(),
      download: vi.fn(),
      remove: vi.fn(),
      getPublicUrl: vi.fn(),
    })),
  }

  return {
    from: mockFrom,
    auth: mockAuth,
    storage: mockStorage,
    // Expose mocks for assertion/configuration
    mocks: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      gt: mockGt,
      lt: mockLt,
      gte: mockGte,
      lte: mockLte,
      in: mockIn,
      order: mockOrder,
      limit: mockLimit,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
      range: mockRange,
      from: mockFrom,
    },
  }
}

/**
 * Mock createBrowserClient for client-side tests
 */
export const mockCreateBrowserClient = vi.fn(() => createMockSupabaseClient())

/**
 * Mock createServerClient for server-side tests
 */
export const mockCreateServerClient = vi.fn(() => createMockSupabaseClient())
