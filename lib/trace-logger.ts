// Server-side trace logger - writes directly to database
// For client-side usage, use lib/trace.ts which auto-detects environment

import { createClient } from "@supabase/supabase-js"

// Types
export type TraceLevel = "debug" | "info" | "warn" | "error"

export interface TraceOptions {
  category?: string
  payload?: Record<string, unknown>
  userId?: string
  userEmail?: string
  sessionId?: string
  requestId?: string
  userAgent?: string
  ipAddress?: string
  isClient?: boolean
  sourceFile?: string // Allow manual override for client-side
  sourceLine?: number | null
  functionName?: string | null
}

export interface TraceLogEntry {
  id: string
  created_at: string
  source_file: string
  source_line: number | null
  function_name: string | null
  level: TraceLevel
  category: string | null
  message: string
  payload: Record<string, unknown> | null
  user_id: string | null
  user_email: string | null
  session_id: string | null
  request_id: string | null
  environment: string
  user_agent: string | null
  ip_address: string | null
  is_client: boolean
}

export interface TraceSettings {
  id: string
  enabled: boolean
  retention_days: number
  updated_at: string
}

// Counter for cleanup trigger (every 100th write)
let writeCounter = 0

// Check if Supabase is configured
const isSupabaseConfigured = () =>
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

// Create a direct Supabase client for trace logging (bypasses cookie requirements)
const getTraceClient = () => {
  if (!isSupabaseConfigured()) return null
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Get current environment
const getEnvironment = (): string => {
  if (process.env.NODE_ENV === "development") return "development"
  if (process.env.VERCEL_ENV === "preview") return "preview"
  if (process.env.VERCEL_ENV === "production") return "production"
  return process.env.NODE_ENV || "unknown"
}

// Check if we're in development mode
const isDevelopment = () => process.env.NODE_ENV === "development"

// Parse stack trace to extract source file, line number, and function name
function parseStackTrace(): { sourceFile: string; sourceLine: number | null; functionName: string | null } {
  const error = new Error()
  const stack = error.stack || ""
  const lines = stack.split("\n")
  
  // Skip the first few lines (Error, parseStackTrace, writeTrace, trace.xxx)
  // Find the first line that's not from trace-logger.ts
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i]
    if (line.includes("trace-logger")) continue
    
    // Parse the stack line - formats vary:
    // "    at functionName (file:line:col)"
    // "    at file:line:col"
    // "    at Object.functionName (file:line:col)"
    const match = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):\d+\)?/)
    if (match) {
      let functionName = match[1] || null
      let sourceFile = match[2] || "unknown"
      const sourceLine = match[3] ? parseInt(match[3], 10) : null
      
      // Clean up function name
      if (functionName) {
        functionName = functionName.replace(/^Object\./, "").replace(/^async\s+/, "")
      }
      
      // Clean up source file path - remove webpack internals and get relative path
      sourceFile = sourceFile
        .replace(/^webpack-internal:\/\/\//, "")
        .replace(/^\(app-pages-browser\)\//, "")
        .replace(/^\(rsc\)\//, "")
        .replace(/^\(ssr\)\//, "")
        .replace(/^\(sc_client\)\//, "")
        .replace(/^\(sc_server\)\//, "")
        .replace(/^\(action-browser\)\//, "")
        .replace(/^\.\//, "")
        .replace(/\(.*\)$/, "")
        .replace(/^\(/, "")
        .trim()
      
      return { sourceFile, sourceLine, functionName }
    }
  }
  
  return { sourceFile: "unknown", sourceLine: null, functionName: null }
}

// Fetch trace settings
async function getTraceSettings(): Promise<TraceSettings | null> {
  const client = getTraceClient()
  if (!client) return null
  
  const { data, error } = await client
    .from("trace_settings")
    .select("*")
    .eq("id", "default")
    .single()
  
  if (error) {
    console.error("[trace-logger] Failed to fetch settings:", error.message)
    return null
  }
  
  return data
}

// Cleanup old logs based on retention settings
async function cleanupOldLogs(retentionDays: number): Promise<void> {
  if (retentionDays <= 0) return // 0 means never delete
  
  const client = getTraceClient()
  if (!client) return
  
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
  
  const { error } = await client
    .from("trace_logs")
    .delete()
    .lt("created_at", cutoffDate.toISOString())
  
  if (error) {
    console.error("[trace-logger] Failed to cleanup old logs:", error.message)
  }
}

// Core write function
async function writeTrace(
  level: TraceLevel,
  message: string,
  options: TraceOptions = {}
): Promise<void> {
  // Use provided source info (from client) or parse from stack trace (server)
  const parsedSource = parseStackTrace()
  const sourceFile = options.sourceFile || parsedSource.sourceFile
  const sourceLine = options.sourceLine !== undefined ? options.sourceLine : parsedSource.sourceLine
  const functionName = options.functionName !== undefined ? options.functionName : parsedSource.functionName
  const isClient = options.isClient ?? false
  const environment = getEnvironment()
  
  // Always log to console in development
  if (isDevelopment()) {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`
    const location = `[${sourceFile}${sourceLine ? `:${sourceLine}` : ""}${functionName ? ` ${functionName}` : ""}]`
    const payload = options.payload ? ` ${JSON.stringify(options.payload)}` : ""
    console.log(`${prefix} ${location} ${message}${payload}`)
  }
  
  // Attempt to write to database
  const client = getTraceClient()
  if (!client) return
  
  try {
    // Check if tracing is enabled (with caching to avoid DB hit on every call)
    const settings = await getTraceSettings()
    if (settings && !settings.enabled) return
    
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
      environment,
      user_agent: options.userAgent || null,
      ip_address: options.ipAddress || null,
      is_client: isClient,
    })
    
    if (error) {
      console.error("[trace-logger] Failed to write trace:", error.message)
      return
    }
    
    // Increment counter and trigger cleanup every 100th write
    writeCounter++
    if (writeCounter >= 100) {
      writeCounter = 0
      if (settings && settings.retention_days > 0) {
        // Fire and forget - don't await
        cleanupOldLogs(settings.retention_days).catch(() => {})
      }
    }
  } catch (err) {
    console.error("[trace-logger] Unexpected error:", err)
  }
}

// Public API - individual level functions
export function traceDebug(message: string, options?: TraceOptions): void {
  writeTrace("debug", message, options)
}

export function traceInfo(message: string, options?: TraceOptions): void {
  writeTrace("info", message, options)
}

export function traceWarn(message: string, options?: TraceOptions): void {
  writeTrace("warn", message, options)
}

export function traceError(message: string, options?: TraceOptions): void {
  writeTrace("error", message, options)
}

// Server-side trace object for direct import in server code
export const serverTrace = {
  debug: traceDebug,
  info: traceInfo,
  warn: traceWarn,
  error: traceError,
}

// Export writeTrace for API route usage
export { writeTrace }
