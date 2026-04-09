import { vi } from "vitest"

/**
 * Mock Supabase client for testing
 * Returns chainable methods that can be configured per test
 */
export const createMockSupabaseClient = () => {
  const createChainableMock = (finalResult: unknown = { data: null, error: null }) => {
    type ChainType = {
      select: ReturnType<typeof vi.fn>
      insert: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
      delete: ReturnType<typeof vi.fn>
      eq: ReturnType<typeof vi.fn>
      neq: ReturnType<typeof vi.fn>
      gt: ReturnType<typeof vi.fn>
      lt: ReturnType<typeof vi.fn>
      gte: ReturnType<typeof vi.fn>
      lte: ReturnType<typeof vi.fn>
      in: ReturnType<typeof vi.fn>
      is: ReturnType<typeof vi.fn>
      order: ReturnType<typeof vi.fn>
      limit: ReturnType<typeof vi.fn>
      range: ReturnType<typeof vi.fn>
      single: ReturnType<typeof vi.fn>
      maybeSingle: ReturnType<typeof vi.fn>
      then: (resolve: (value: unknown) => unknown) => Promise<unknown>
    }
    const chain: ChainType = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      eq: vi.fn(),
      neq: vi.fn(),
      gt: vi.fn(),
      lt: vi.fn(),
      gte: vi.fn(),
      lte: vi.fn(),
      in: vi.fn(),
      is: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      range: vi.fn(),
      single: vi.fn().mockResolvedValue(finalResult),
      maybeSingle: vi.fn().mockResolvedValue(finalResult),
      // When chain ends without single/maybeSingle, return a promise
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(finalResult).then(resolve),
    }
    chain.select.mockReturnValue(chain)
    chain.insert.mockReturnValue(chain)
    chain.update.mockReturnValue(chain)
    chain.delete.mockReturnValue(chain)
    chain.eq.mockReturnValue(chain)
    chain.neq.mockReturnValue(chain)
    chain.gt.mockReturnValue(chain)
    chain.lt.mockReturnValue(chain)
    chain.gte.mockReturnValue(chain)
    chain.lte.mockReturnValue(chain)
    chain.in.mockReturnValue(chain)
    chain.is.mockReturnValue(chain)
    chain.order.mockReturnValue(chain)
    chain.limit.mockReturnValue(chain)
    chain.range.mockReturnValue(chain)
    return chain
  }

  const mockFrom = vi.fn((_table: string) => createChainableMock())

  const mockAuth = {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    signInWithPassword: vi.fn(),
    updateUser: vi.fn(),
    resend: vi.fn().mockResolvedValue({ data: null, error: null }),
    admin: {
      deleteUser: vi.fn().mockResolvedValue({ error: null }),
      updateUserById: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
    },
  }

  const mockStorage = {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      download: vi.fn().mockResolvedValue({ data: null, error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://test.com/file.jpg" } }),
    })),
  }

  return {
    from: mockFrom,
    auth: mockAuth,
    storage: mockStorage,
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
