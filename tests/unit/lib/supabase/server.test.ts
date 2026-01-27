import { describe, it, expect, vi, beforeEach } from "vitest"
import { createServerClient, createClient, isSupabaseConfigured } from "@/lib/supabase/server"

// Mock @supabase/ssr
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((url, key, options) => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "test-user" } }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "token" } }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}))

// Mock next/headers - cookies() is now async in Next.js 15
const mockCookieStore = {
  getAll: vi.fn(() => []),
  set: vi.fn(),
}
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}))

describe("Supabase Server Client", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("isSupabaseConfigured", () => {
    it("should return true when environment variables are set", () => {
      // Environment variables are set in test setup
      expect(isSupabaseConfigured).toBe(true)
    })
  })

  describe("createServerClient", () => {
    it("should create a Supabase server client with environment variables", async () => {
      const client = await createServerClient()

      expect(client).toBeDefined()
      expect(client.auth).toBeDefined()
      expect(client.from).toBeDefined()
    })

    it("should return a functioning auth client", async () => {
      const client = await createServerClient()

      const { data: userData } = await client.auth.getUser()
      expect(userData.user).toBeDefined()
      expect(userData.user?.id).toBe("test-user")

      const { data: sessionData } = await client.auth.getSession()
      expect(sessionData.session).toBeDefined()
    })

    it("should return a functioning database client", async () => {
      const client = await createServerClient()

      const query = client.from("test_table")
      const { data } = await query.select()
      expect(data).toEqual([])
    })
  })

  describe("createClient (cached)", () => {
    it("should return a functioning client", async () => {
      const client = await createClient()

      expect(client).toBeDefined()
      expect(client.auth).toBeDefined()

      const { data } = await client.auth.getUser()
      expect(data.user).toBeDefined()
    })
  })
})
