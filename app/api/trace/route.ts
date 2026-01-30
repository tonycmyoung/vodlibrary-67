import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { TraceLevel, TraceOptions } from "@/lib/trace-logger"

// Create a direct Supabase client for trace logging
const getTraceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// Get current environment
const getEnvironment = (): string => {
  if (process.env.NODE_ENV === "development") return "development"
  if (process.env.VERCEL_ENV === "preview") return "preview"
  if (process.env.VERCEL_ENV === "production") return "production"
  return process.env.NODE_ENV || "unknown"
}

// Counter for cleanup trigger
let writeCounter = 0

// Cleanup old logs based on retention settings
async function cleanupOldLogs(client: ReturnType<typeof createClient>, retentionDays: number): Promise<void> {
  if (retentionDays <= 0) return
  
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
  
  await client
    .from("trace_logs")
    .delete()
    .lt("created_at", cutoffDate.toISOString())
}

interface TraceRequestBody {
  level: TraceLevel
  message: string
  sourceFile: string
  sourceLine: number | null
  functionName: string | null
  isClient?: boolean
  options?: TraceOptions
}

export async function POST(request: NextRequest) {
  try {
    const body: TraceRequestBody = await request.json()
    const { level, message, sourceFile, sourceLine, functionName, isClient = true, options = {} } = body

    // Validate required fields
    if (!level || !message || !sourceFile) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate level
    if (!["debug", "info", "warn", "error"].includes(level)) {
      return NextResponse.json({ error: "Invalid trace level" }, { status: 400 })
    }

    const client = getTraceClient()
    if (!client) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    // Check if tracing is enabled
    const { data: settings } = await client
      .from("trace_settings")
      .select("enabled, retention_days")
      .eq("id", "default")
      .single()

    if (settings && !settings.enabled) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    // Get user agent and IP from request
    const userAgent = request.headers.get("user-agent") || undefined
    const forwardedFor = request.headers.get("x-forwarded-for")
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || undefined

    // Insert trace log
    const { error } = await client.from("trace_logs").insert({
      source_file: sourceFile,
      source_line: sourceLine,
      function_name: functionName,
      level,
      category: options.category || null,
      message,
      payload: options.payload || null,
      user_id: options.userId || null,
      user_email: options.userEmail || null,
      session_id: options.sessionId || null,
      request_id: options.requestId || null,
      environment: getEnvironment(),
      user_agent: options.userAgent || userAgent || null,
      ip_address: options.ipAddress || ipAddress || null,
      is_client: isClient,
    })

    if (error) {
      console.error("[trace-api] Failed to write trace:", error.message)
      return NextResponse.json({ error: "Failed to write trace" }, { status: 500 })
    }

    // Increment counter and trigger cleanup every 100th write
    writeCounter++
    if (writeCounter >= 100) {
      writeCounter = 0
      if (settings && settings.retention_days > 0) {
        // Fire and forget
        cleanupOldLogs(client, settings.retention_days).catch(() => {})
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[trace-api] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
