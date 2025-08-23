import { createBrowserClient } from "@supabase/ssr"

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

export { createBrowserClient }

const createMockClient = () => ({
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: { user: null }, error: { message: "Supabase not configured" } }),
    signUp: () => Promise.resolve({ data: { user: null }, error: { message: "Supabase not configured" } }),
    signOut: () => Promise.resolve({ error: null }),
    resetPasswordForEmail: () => Promise.resolve({ data: {}, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  from: () => ({
    select: () => ({ data: [], error: null }),
    insert: () => ({ data: [], error: null }),
    update: () => ({ data: [], error: null }),
    delete: () => ({ data: [], error: null }),
  }),
})

export function createClient() {
  if (!isSupabaseConfigured) {
    console.warn("[v0] Supabase environment variables not configured, using mock client")
    return createMockClient() as any
  }

  try {
    return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  } catch (error) {
    console.error("[v0] Failed to create Supabase client:", error)
    return createMockClient() as any
  }
}

export const supabase = (() => {
  if (!isSupabaseConfigured) {
    console.warn("[v0] Supabase not configured, using mock client")
    return createMockClient() as any
  }

  try {
    return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  } catch (error) {
    console.error("[v0] Failed to create Supabase singleton:", error)
    return createMockClient() as any
  }
})()
