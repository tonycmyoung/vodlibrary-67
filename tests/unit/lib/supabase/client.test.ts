import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { createClient, supabase } from "@/lib/supabase/client"
import { createBrowserClient } from "@supabase/ssr"

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(),
}))

describe("lib/supabase/client", () => {
  const mockSupabaseClient = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    storage: { from: vi.fn() },
    rpc: vi.fn(),
  }

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key"
    vi.mocked(createBrowserClient).mockReturnValue(mockSupabaseClient as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("createClient", () => {
    it("should create a Supabase browser client with environment variables", () => {
      const client = createClient()

      expect(createBrowserClient).toHaveBeenCalledWith("https://test.supabase.co", "test-anon-key")
      expect(client).toBe(mockSupabaseClient)
    })

    it("should use environment variables from process.env", () => {
      createClient()

      expect(createBrowserClient).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      )
    })
  })

  describe("supabase singleton", () => {
    it("should lazily create client on auth access", () => {
      const authModule = supabase.auth

      expect(createBrowserClient).toHaveBeenCalledTimes(1)
      expect(authModule).toBe(mockSupabaseClient.auth)
    })

    it("should lazily create client on from access", () => {
      const fromModule = supabase.from

      expect(createBrowserClient).toHaveBeenCalledTimes(1)
      expect(fromModule).toBe(mockSupabaseClient.from)
    })

    it("should lazily create client on storage access", () => {
      const storageModule = supabase.storage

      expect(createBrowserClient).toHaveBeenCalledTimes(1)
      expect(storageModule).toBe(mockSupabaseClient.storage)
    })

    it("should lazily create client on rpc access", () => {
      const rpcModule = supabase.rpc

      expect(createBrowserClient).toHaveBeenCalledTimes(1)
      expect(rpcModule).toBe(mockSupabaseClient.rpc)
    })

    it("should reuse the same client instance across multiple accesses", () => {
      const auth1 = supabase.auth
      const from1 = supabase.from
      const storage1 = supabase.storage
      const rpc1 = supabase.rpc

      // Should only create client once
      expect(createBrowserClient).toHaveBeenCalledTimes(1)

      // All should reference the same client
      expect(auth1).toBe(mockSupabaseClient.auth)
      expect(from1).toBe(mockSupabaseClient.from)
      expect(storage1).toBe(mockSupabaseClient.storage)
      expect(rpc1).toBe(mockSupabaseClient.rpc)
    })
  })
})
