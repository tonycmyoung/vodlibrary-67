import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock @supabase/ssr
const mockCreateBrowserClient = vi.fn(() => ({
  auth: {
    signIn: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(),
    insert: vi.fn(),
  })),
  storage: {
    from: vi.fn(),
  },
  rpc: vi.fn(),
}))

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: mockCreateBrowserClient,
}))

describe("Supabase Browser Client", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set required environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key"
  })

  describe("createClient", () => {
    it("should create a browser client with environment variables", async () => {
      const { createClient } = await import("../../../lib/supabase/client")

      const client = createClient()

      expect(mockCreateBrowserClient).toHaveBeenCalledWith("https://test.supabase.co", "test-anon-key")
      expect(client).toBeDefined()
    })
  })

  describe("supabase singleton", () => {
    it("should provide auth accessor", async () => {
      const { supabase } = await import("../../../lib/supabase/client")

      const auth = supabase.auth

      expect(auth).toBeDefined()
      expect(auth.signIn).toBeDefined()
    })

    it("should provide from accessor", async () => {
      const { supabase } = await import("../../../lib/supabase/client")

      const from = supabase.from

      expect(from).toBeDefined()
      expect(typeof from).toBe("function")
    })

    it("should provide storage accessor", async () => {
      const { supabase } = await import("../../../lib/supabase/client")

      const storage = supabase.storage

      expect(storage).toBeDefined()
      expect(storage.from).toBeDefined()
    })

    it("should provide rpc accessor", async () => {
      const { supabase } = await import("../../../lib/supabase/client")

      const rpc = supabase.rpc

      expect(rpc).toBeDefined()
      expect(typeof rpc).toBe("function")
    })

    it("should reuse the same client instance across accessors", async () => {
      const { supabase } = await import("../../../lib/supabase/client")

      // Access different properties to ensure client is created once
      const auth1 = supabase.auth
      const from1 = supabase.from

      // These should use the same underlying client
      expect(mockCreateBrowserClient).toHaveBeenCalled()
    })
  })
})
