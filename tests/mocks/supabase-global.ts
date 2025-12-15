import { vi } from "vitest"

export const mockSupabaseData = {
  curriculums: [] as any[],
  video_curriculums: [] as any[],
  users: [] as any[],
  notifications: [] as any[],
  performers: [] as any[],
  videos: [] as any[],
  video_views: [] as any[],
  user_video_views: [] as any[],
  video_categories: [] as any[],
  video_performers: [] as any[],
}

export const mockSupabaseErrors = {
  select: null as any,
  insert: null as any,
  update: null as any,
  delete: null as any,
}

export function createMockSupabaseClient() {
  const mockFrom = (table: string) => {
    const chain = {
      select: vi.fn((columns = "*", options?: any) => {
        if (mockSupabaseErrors.select) {
          return { ...chain, data: null, error: mockSupabaseErrors.select }
        }

        const data = mockSupabaseData[table as keyof typeof mockSupabaseData] || []

        if (options?.count === "exact" && options?.head === true) {
          return { ...chain, count: data.length, data: null, error: null }
        }

        return { ...chain, data, error: null }
      }),
      insert: vi.fn((values: any) => {
        if (mockSupabaseErrors.insert) {
          return { ...chain, data: null, error: mockSupabaseErrors.insert }
        }
        const newData = Array.isArray(values) ? values : [values]
        return { ...chain, data: newData, error: null }
      }),
      update: vi.fn((values: any) => {
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
      eq: vi.fn((column: string, value: any) => chain),
      gt: vi.fn((column: string, value: any) => chain),
      gte: vi.fn((column: string, value: any) => chain),
      lte: vi.fn((column: string, value: any) => chain),
      in: vi.fn((column: string, values: any[]) => chain),
      order: vi.fn((column: string, options?: any) => chain),
      limit: vi.fn((count: number) => chain),
      single: vi.fn(() => {
        const data = mockSupabaseData[table as keyof typeof mockSupabaseData]
        if (!data || data.length === 0) {
          return Promise.resolve({ data: null, error: { message: "No rows found" } })
        }
        return Promise.resolve({ data: data[0], error: null })
      }),
      maybeSingle: vi.fn(() => {
        const data = mockSupabaseData[table as keyof typeof mockSupabaseData]
        return Promise.resolve({ data: data?.[0] || null, error: null })
      }),
    }

    // Make all methods return promises when needed
    Object.keys(chain).forEach((key) => {
      const original = chain[key as keyof typeof chain]
      if (typeof original === "function" && !["single", "maybeSingle"].includes(key)) {
        chain[key as keyof typeof chain] = vi.fn((...args: any[]) => {
          const result = (original as any)(...args)
          if (result === chain) return chain
          return Promise.resolve(result)
        }) as any
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
    mockSupabaseData[key as keyof typeof mockSupabaseData] = []
  })
  Object.keys(mockSupabaseErrors).forEach((key) => {
    mockSupabaseErrors[key as keyof typeof mockSupabaseErrors] = null
  })
}
