import { vi } from "vitest"

export const mockSupabaseData: Record<string, unknown[]> = {
  curriculums: [],
  video_curriculums: [],
  users: [],
  notifications: [],
  performers: [],
  videos: [],
  video_views: [],
  user_video_views: [],
  video_categories: [],
  video_performers: [],
}

export const mockSupabaseErrors: Record<string, { message: string } | null> = {
  select: null,
  insert: null,
  update: null,
  delete: null,
}

export function createMockSupabaseClient() {
  const mockFrom = (table: string) => {
    const chain = {
      select: vi.fn((_columns = "*", _options?: { count?: string; head?: boolean }) => {
        if (mockSupabaseErrors.select) {
          return { ...chain, data: null, error: mockSupabaseErrors.select }
        }

        const data = mockSupabaseData[table] ?? []

        if (_options?.count === "exact" && _options?.head === true) {
          return { ...chain, count: data.length, data: null, error: null }
        }

        return { ...chain, data, error: null }
      }),
      insert: vi.fn((values: unknown) => {
        if (mockSupabaseErrors.insert) {
          return { ...chain, data: null, error: mockSupabaseErrors.insert }
        }
        const newData = Array.isArray(values) ? values : [values]
        return { ...chain, data: newData, error: null }
      }),
      update: vi.fn((values: unknown) => {
        if (mockSupabaseErrors.update) {
          return { ...chain, data: null, error: mockSupabaseErrors.update }
        }
        return { ...chain, data: [values], error: null }
      }),
      delete: vi.fn(() => {
        if (mockSupabaseErrors.delete) {
          return { ...chain, data: null, error: mockSupabaseErrors.delete }
        }
        return { ...chain, data: null, error: null }
      }),
      eq: vi.fn((_column: string, _value: unknown) => chain),
      gt: vi.fn((_column: string, _value: unknown) => chain),
      gte: vi.fn((_column: string, _value: unknown) => chain),
      lte: vi.fn((_column: string, _value: unknown) => chain),
      in: vi.fn((_column: string, _values: unknown[]) => chain),
      order: vi.fn((_column: string, _options?: unknown) => chain),
      limit: vi.fn((_count: number) => chain),
      single: vi.fn(() => {
        const data = mockSupabaseData[table]
        if (!data || data.length === 0) {
          return Promise.resolve({ data: null, error: { message: "No rows found" } })
        }
        return Promise.resolve({ data: data[0], error: null })
      }),
      maybeSingle: vi.fn(() => {
        const data = mockSupabaseData[table]
        return Promise.resolve({ data: data?.[0] ?? null, error: null })
      }),
    }

    // Make all methods return promises when needed
    Object.keys(chain).forEach((key) => {
      const original = chain[key as keyof typeof chain]
      if (typeof original === "function" && !["single", "maybeSingle"].includes(key)) {
        chain[key as keyof typeof chain] = vi.fn((...args: unknown[]) => {
          const result = (original as (...a: unknown[]) => unknown)(...args)
          if (result === chain) return chain
          return Promise.resolve(result)
        }) as never
      }
    })

    return chain
  }

  return {
    from: vi.fn(mockFrom),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
  }
}

// Mock @supabase/supabase-js
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => createMockSupabaseClient()),
}))

// Mock @supabase/ssr
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => createMockSupabaseClient()),
}))

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}))

export function resetMockData() {
  Object.keys(mockSupabaseData).forEach((key) => {
    mockSupabaseData[key] = []
  })
  Object.keys(mockSupabaseErrors).forEach((key) => {
    mockSupabaseErrors[key] = null
  })
}
