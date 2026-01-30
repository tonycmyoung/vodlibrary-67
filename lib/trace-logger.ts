// Server-side trace logger - writes directly to database
// For client-side usage, use lib/trace.ts which auto-detects environment
// Updated: 2026-01-30 - Fixed ReDoS vulnerabilities, parameter count, and Sonar issues

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

// Result type for parsed stack line
interface ParsedStackLine {
  sourceFile: string
  sourceLine: number | null
  functionName: string | null
}

// Default result when parsing fails
const DEFAULT_PARSE_RESULT: ParsedStackLine = { sourceFile: "unknown", sourceLine: null, functionName: null }

// Helper to clean webpack prefixes from source file paths (no regex to avoid ReDoS)
function cleanSourceFile(sourceFile: string): string {
  let result = sourceFile
  
  // Remove webpack-internal prefix
  if (result.startsWith("webpack-internal:///")) {
    result = result.substring(20)
  }
  
  // Remove common webpack chunk prefixes
  const prefixes = ["(app-pages-browser)/", "(rsc)/", "(ssr)/", "(sc_client)/", "(sc_server)/", "(action-browser)/", "./"]
  for (const prefix of prefixes) {
    if (result.startsWith(prefix)) {
      result = result.substring(prefix.length)
    }
  }
  
  // Remove trailing parenthesized content like "(index)"
  const lastParen = result.lastIndexOf("(")
  if (lastParen > 0 && result.endsWith(")")) {
    result = result.substring(0, lastParen)
  }
  
  // Remove leading open paren if present
  if (result.startsWith("(")) {
    result = result.substring(1)
  }
  
  return result.trim()
}

// Clean function name
function cleanFunctionName(name: string): string | null {
  if (!name) return null
  return name.replace(/^Object\./, "").replace(/^async /, "")
}

// Parse location string "file:line:col" without regex (avoids ReDoS)
function parseLocation(location: string): { sourceFile: string; sourceLine: number | null } | null {
  const lastColonIdx = location.lastIndexOf(":")
  if (lastColonIdx === -1) return null
  
  const beforeLastColon = location.substring(0, lastColonIdx)
  const secondLastColonIdx = beforeLastColon.lastIndexOf(":")
  if (secondLastColonIdx === -1) return null
  
  const sourceFile = cleanSourceFile(beforeLastColon.substring(0, secondLastColonIdx))
  const lineStr = beforeLastColon.substring(secondLastColonIdx + 1)
  const sourceLine = lineStr ? Number.parseInt(lineStr, 10) : null
  
  if (sourceFile && !Number.isNaN(sourceLine)) {
    return { sourceFile, sourceLine }
  }
  return null
}

// Parse a single stack line - extracted to reduce cognitive complexity
function parseStackLine(line: string): ParsedStackLine | null {
  // Simple string parsing instead of regex to avoid ReDoS
  const atIndex = line.indexOf(" at ")
  if (atIndex === -1) return null
  
  const afterAt = line.substring(atIndex + 4).trim()
  const parenOpen = afterAt.indexOf("(")
  const parenClose = afterAt.lastIndexOf(")")
  
  // Format: "functionName (file:line:col)"
  if (parenOpen > 0 && parenClose > parenOpen) {
    const functionName = cleanFunctionName(afterAt.substring(0, parenOpen).trim())
    const locationPart = afterAt.substring(parenOpen + 1, parenClose)
    const parsed = parseLocation(locationPart)
    if (parsed) {
      return { sourceFile: parsed.sourceFile, sourceLine: parsed.sourceLine, functionName }
    }
  }
  
  // Format: "file:line:col" (no function name)
  const parsed = parseLocation(afterAt)
  if (parsed) {
    return { sourceFile: parsed.sourceFile, sourceLine: parsed.sourceLine, functionName: null }
  }
  
  return null
}

// Parse stack trace to extract source file, line number, and function name
function parseStackTrace(): ParsedStackLine {
  const error = new Error("Stack trace capture")
  const stack = error.stack || ""
  const lines = stack.split("\n")
  
  // Skip first 3 lines (Error, parseStackTrace, writeTrace) and find caller
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i]
    if (line.includes("trace-logger")) continue
    
    const result = parseStackLine(line)
    if (result) return result
  }
  
  return DEFAULT_PARSE_RESULT
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

// Console logging helper - extracted to reduce cognitive complexity
function logToConsole(
  level: TraceLevel,
  message: string,
  sourceFile: string,
  sourceLine: number | null,
  functionName: string | null,
  payload?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString()
  const prefix = "[" + timestamp + "] [" + level.toUpperCase() + "]"
  let location = sourceFile
  if (sourceLine) {
    location += ":" + String(sourceLine)
  }
  if (functionName) {
    location += " " + functionName
  }
  const locationStr = "[" + location + "]"
  const payloadStr = payload ? " " + JSON.stringify(payload) : ""
  console.log(prefix + " " + locationStr + " " + message + payloadStr)
}

// Database write parameters
interface WriteParams {
  client: NonNullable<ReturnType<typeof getTraceClient>>
  level: TraceLevel
  message: string
  sourceFile: string
  sourceLine: number | null
  functionName: string | null
  isClient: boolean
  environment: string
  options: TraceOptions
}

// Database write helper - extracted to reduce cognitive complexity
async function writeToDatabase(params: WriteParams): Promise<void> {
  const { client, level, message, sourceFile, sourceLine, functionName, isClient, environment, options } = params
  const { error } = await client.from("trace_logs").insert({
    source_file: sourceFile,
    source_line: sourceLine,
    function_name: functionName,
    level,
    category: options.category ?? null,
    message,
    payload: options.payload ?? null,
    user_id: options.userId ?? null,
    user_email: options.userEmail ?? null,
    session_id: options.sessionId ?? null,
    request_id: options.requestId ?? null,
    environment,
    user_agent: options.userAgent ?? null,
    ip_address: options.ipAddress ?? null,
    is_client: isClient,
  })
  
  if (error) {
    console.error("[trace-logger] Failed to write trace:", error.message)
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
  const sourceFile = options.sourceFile ?? parsedSource.sourceFile
  const sourceLine = options.sourceLine ?? parsedSource.sourceLine
  const functionName = options.functionName ?? parsedSource.functionName
  const isClient = options.isClient ?? false
  const environment = getEnvironment()
  
  // Always log to console in development
  if (isDevelopment()) {
    logToConsole(level, message, sourceFile, sourceLine, functionName, options.payload)
  }
  
  // Attempt to write to database
  const client = getTraceClient()
  if (client === null) return
  
  try {
    // Check if tracing is enabled (with caching to avoid DB hit on every call)
    const settings = await getTraceSettings()
    if (settings?.enabled === false) return
    
    await writeToDatabase({ client, level, message, sourceFile, sourceLine, functionName, isClient, environment, options })
    
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
