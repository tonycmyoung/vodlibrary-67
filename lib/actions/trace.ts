"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "../auth"
import type { TraceLogEntry, TraceSettings, TraceLevel } from "../trace-logger"

export interface TraceLogsFilter {
  level?: TraceLevel | "all"
  category?: string
  sourceFile?: string
  search?: string
  startDate?: string
  endDate?: string
  limit?: number
}

export async function fetchTraceLogs(filter: TraceLogsFilter = {}) {
  const user = await getCurrentUser()
  if (user?.role !== "Admin") {
    throw new Error("Unauthorized")
  }

  const serviceSupabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = serviceSupabase
    .from("trace_logs")
    .select("*")
    .order("created_at", { ascending: false })

  // Apply filters
  if (filter.level && filter.level !== "all") {
    query = query.eq("level", filter.level)
  }

  if (filter.category) {
    query = query.eq("category", filter.category)
  }

  if (filter.sourceFile) {
    query = query.ilike("source_file", `%${filter.sourceFile}%`)
  }

  if (filter.search) {
    query = query.or(`message.ilike.%${filter.search}%,source_file.ilike.%${filter.search}%,function_name.ilike.%${filter.search}%`)
  }

  if (filter.startDate) {
    query = query.gte("created_at", filter.startDate)
  }

  if (filter.endDate) {
    query = query.lte("created_at", filter.endDate)
  }

  query = query.limit(filter.limit || 200)

  const { data, error } = await query

  if (error) {
    console.error("[trace] Error fetching trace logs:", error)
    throw new Error("Failed to fetch trace logs")
  }

  return data as TraceLogEntry[]
}

export async function clearTraceLogs(beforeDate?: string) {
  const user = await getCurrentUser()
  if (user?.role !== "Admin") {
    throw new Error("Unauthorized")
  }

  const serviceSupabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = serviceSupabase
    .from("trace_logs")
    .delete()

  if (beforeDate) {
    query = query.lt("created_at", beforeDate)
  } else {
    // Delete all records
    query = query.neq("id", "00000000-0000-0000-0000-000000000000")
  }

  const { error } = await query

  if (error) {
    console.error("[trace] Error clearing trace logs:", error)
    throw new Error("Failed to clear trace logs")
  }

  revalidatePath("/admin/trace")
}

export async function fetchTraceSettings(): Promise<TraceSettings> {
  const user = await getCurrentUser()
  if (user?.role !== "Admin") {
    throw new Error("Unauthorized")
  }

  const serviceSupabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await serviceSupabase
    .from("trace_settings")
    .select("*")
    .eq("id", "default")
    .single()

  if (error) {
    console.error("[trace] Error fetching trace settings:", error)
    // Return default settings if not found
    return {
      id: "default",
      enabled: true,
      retention_days: 7,
      updated_at: new Date().toISOString(),
    }
  }

  return data as TraceSettings
}

export async function updateTraceSettings(settings: Partial<Pick<TraceSettings, "enabled" | "retention_days">>) {
  const user = await getCurrentUser()
  if (user?.role !== "Admin") {
    throw new Error("Unauthorized")
  }

  const serviceSupabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await serviceSupabase
    .from("trace_settings")
    .upsert({
      id: "default",
      ...settings,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    console.error("[trace] Error updating trace settings:", error)
    throw new Error("Failed to update trace settings")
  }

  revalidatePath("/admin/trace")
}

export async function getTraceCategories(): Promise<string[]> {
  const user = await getCurrentUser()
  if (user?.role !== "Admin") {
    throw new Error("Unauthorized")
  }

  const serviceSupabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await serviceSupabase
    .from("trace_logs")
    .select("category")
    .not("category", "is", null)

  if (error) {
    console.error("[trace] Error fetching categories:", error)
    return []
  }

  // Get unique categories
  const categories = [...new Set(data?.map((d) => d.category).filter(Boolean))] as string[]
  return categories.sort()
}

export async function getTraceSourceFiles(): Promise<string[]> {
  const user = await getCurrentUser()
  if (user?.role !== "Admin") {
    throw new Error("Unauthorized")
  }

  const serviceSupabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await serviceSupabase
    .from("trace_logs")
    .select("source_file")

  if (error) {
    console.error("[trace] Error fetching source files:", error)
    return []
  }

  // Get unique source files
  const files = [...new Set(data?.map((d) => d.source_file).filter(Boolean))] as string[]
  return files.sort()
}

// Format logs for clipboard - JSON format optimized for AI conversation
export function formatTraceLogsForClipboard(logs: TraceLogEntry[]): string {
  const formatted = logs.map((log) => ({
    timestamp: log.created_at,
    level: log.level,
    source: `${log.source_file}${log.source_line ? `:${log.source_line}` : ""}${log.function_name ? ` (${log.function_name})` : ""}`,
    category: log.category,
    message: log.message,
    payload: log.payload,
    environment: log.environment,
    user: log.user_email || log.user_id,
  }))

  return JSON.stringify(formatted, null, 2)
}
