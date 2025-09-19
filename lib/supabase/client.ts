let _createBrowserClient: typeof import("@supabase/ssr").createBrowserClient | null = null

async function getCreateBrowserClient() {
  if (_createBrowserClient) return _createBrowserClient

  try {
    const { createBrowserClient } = await import("@supabase/ssr")
    _createBrowserClient = createBrowserClient
    return createBrowserClient
  } catch (error) {
    console.error("Failed to load Supabase client:", error)
    throw new Error("Authentication service unavailable")
  }
}

export async function createClient() {
  const createBrowserClient = await getCreateBrowserClient()
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

let _supabase: Awaited<ReturnType<typeof createClient>> | null = null

export const supabase = {
  async getAuth() {
    if (!_supabase) _supabase = await createClient()
    return _supabase.auth
  },
  async getFrom() {
    if (!_supabase) _supabase = await createClient()
    return _supabase.from
  },
  async getStorage() {
    if (!_supabase) _supabase = await createClient()
    return _supabase.storage
  },
  async getRpc() {
    if (!_supabase) _supabase = await createClient()
    return _supabase.rpc
  },
}

export { getCreateBrowserClient as createBrowserClient }
