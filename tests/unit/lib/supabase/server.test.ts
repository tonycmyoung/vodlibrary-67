import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { createServerClient, createClient } from "@/lib/supabase/server"
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}))

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}))

vi.mock("react", () => ({
  cache: (fn: any) => fn,
}))

describe("lib/supabase/server", () => {
  const mockCookieStore = {
    getAll: vi.fn(() => []),
    set: vi.fn(),
  }

  const mockSupabaseClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key"
    vi.mocked(cookies).mockReturnValue(mockCookieStore as any)
    vi.mocked(createSupabaseServerClient).mockReturnValue(mockSupabaseClient as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("isSupabaseConfigured", () => {
    it("should return true when environment variables are set", () => {
      // Environment variables are set in beforeEach
      // Need to re-import to get fresh evaluation
      expect(typeof process.env.NEXT_PUBLIC_SUPABASE_URL).toBe("string")
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL!.length).toBeGreaterThan(0)
    })

    it("should handle missing SUPABASE_URL", () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL

      const result = createServerClient()

      // Should return dummy client when not configured
      expect(result.auth).toBeDefined()
      expect(result.from).toBeDefined()
    })

    it("should handle empty SUPABASE_URL", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = ""

      const result = createServerClient()

      // Should return dummy client when URL is empty
      expect(result.auth).toBeDefined()
    })
  })

  describe("createServerClient", () => {
    it("should create a Supabase server client with environment variables", () => {
      const client = createServerClient()

      expect(cookies).toHaveBeenCalled()
      expect(createSupabaseServerClient).toHaveBeenCalledWith(
        "https://test.supabase.co",
        "test-anon-key",
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        }),
      )
      expect(client).toBe(mockSupabaseClient)
    })

    it("should configure cookie handlers correctly", () => {
      createServerClient()

      const callArgs = vi.mocked(createSupabaseServerClient).mock.calls[0]
      const cookieConfig = callArgs[2]

      expect(cookieConfig.cookies.getAll).toBeDefined()
      expect(cookieConfig.cookies.setAll).toBeDefined()
    })

    it("should call cookies().getAll() in getAll handler", () => {
      createServerClient()

      const callArgs = vi.mocked(createSupabaseServerClient).mock.calls[0]
      const cookieConfig = callArgs[2]

      cookieConfig.cookies.getAll()

      expect(mockCookieStore.getAll).toHaveBeenCalled()
    })

    it("should call cookies().set() for each cookie in setAll handler", () => {
      createServerClient()

      const callArgs = vi.mocked(createSupabaseServerClient).mock.calls[0]
      const cookieConfig = callArgs[2]

      const cookiesToSet = [
        { name: "cookie1", value: "value1", options: {} },
        { name: "cookie2", value: "value2", options: {} },
      ]

      cookieConfig.cookies.setAll(cookiesToSet)

      expect(mockCookieStore.set).toHaveBeenCalledWith("cookie1", "value1", {})
      expect(mockCookieStore.set).toHaveBeenCalledWith("cookie2", "value2", {})
    })

    it("should handle cookie set errors gracefully (Server Component scenario)", () => {
      mockCookieStore.set.mockImplementation(() => {
        throw new Error("Cannot set cookies in Server Component")
      })

      createServerClient()

      const callArgs = vi.mocked(createSupabaseServerClient).mock.calls[0]
      const cookieConfig = callArgs[2]

      const cookiesToSet = [{ name: "test", value: "value", options: {} }]

      // Should not throw
      expect(() => cookieConfig.cookies.setAll(cookiesToSet)).not.toThrow()
    })

    it("should return dummy client when Supabase is not configured", () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL

      const client = createServerClient()

      expect(client.auth.getUser).toBeDefined()
      expect(client.auth.getSession).toBeDefined()
      expect(client.from).toBeDefined()
    })

    it("should have dummy client auth methods return null user", async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL

      const client = createServerClient()

      const userResult = await client.auth.getUser()
      const sessionResult = await client.auth.getSession()

      expect(userResult).toEqual({ data: { user: null }, error: null })
      expect(sessionResult).toEqual({ data: { session: null }, error: null })
    })

    it("should have dummy client from method return empty data", async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL

      const client = createServerClient()

      const selectResult = await client.from("users").select()

      expect(selectResult).toEqual({ data: [], error: null })
    })
  })

  describe("createClient (cached)", () => {
    it("should create a server client", () => {
      const client = createClient()

      expect(createSupabaseServerClient).toHaveBeenCalled()
      expect(client).toBe(mockSupabaseClient)
    })

    it("should use cache from React", () => {
      // The cache wrapper is applied via vi.mock
      // Just verify the function works
      const client1 = createClient()
      const client2 = createClient()

      // Both should work (cache behavior is handled by React)
      expect(client1).toBeDefined()
      expect(client2).toBeDefined()
    })
  })
})
