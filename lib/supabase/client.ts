import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

let _supabase: ReturnType<typeof createClient> | null = null

export const supabase = {
  get auth() {
    if (!_supabase) _supabase = createClient()
    return _supabase.auth
  },
  get from() {
    if (!_supabase) _supabase = createClient()
    return _supabase.from
  },
  get storage() {
    if (!_supabase) _supabase = createClient()
    return _supabase.storage
  },
  get rpc() {
    if (!_supabase) _supabase = createClient()
    return _supabase.rpc
  },
}

export { createBrowserClient }
