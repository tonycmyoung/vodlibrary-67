// Unified trace logger - works in both client and server environments
// - Server: writes directly to database
// - Client: sends to /api/trace endpoint
// SonarCloud fixes applied: 2026-01-30

import type { TraceLevel, TraceOptions } from "./trace-logger"

// Re-export types for convenience
export type { TraceLevel, TraceOptions, TraceLogEntry, TraceSettings } from "./trace-logger"

// Check if we're on the server
const isServer = globalThis.window === undefined

// Check if we're in development mode
const isDevelopment = () => process.env.NODE_ENV === "development"

// Helper to clean webpack prefixes from source file paths
function cleanSourceFile(sourceFile: string): string {
  return sourceFile
    .replace(/^webpack-internal:\/\/\//, "")
    .replace(/^\(app-pages-browser\)\//, "")
    .replace(/^\(rsc\)\//, "")
    .replace(/^\(ssr\)\//, "")
    .replace(/^\(sc_client\)\//, "")
    .replace(/^\(sc_server\)\//, "")
    .replace(/^\(action-browser\)\//, "")
    .replace(/^\.\//, "")
    .replace(/\([^)]*\)$/, "")
    .replace(/^\(/, "")
    .trim()
}

// Result type for parsed stack line
interface ParsedStackLine {
  sourceFile: string
  sourceLine: number | null
  functionName: string | null
}

// Default result when parsing fails
const DEFAULT_PARSE_RESULT: ParsedStackLine = { sourceFile: "unknown", sourceLine: null, functionName: null }

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

// Clean function name
function cleanFunctionName(name: string): string | null {
  if (!name) return null
  return name.replace(/^Object\./, "").replace(/^async /, "")
}

// Parse a single stack line - extracted to reduce cognitive complexity
function parseStackLine(line: string): ParsedStackLine | null {
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

// Parse stack trace to extract source info (works in both environments)
function parseStackTrace(): ParsedStackLine {
  const error = new Error("Stack trace capture")
  const stack = error.stack || ""
  const lines = stack.split("\n")
  
  // Skip first 3 lines and find caller (not trace.ts or trace-logger)
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i]
    if (line.includes("trace.ts") || line.includes("trace-logger")) continue
    
    const result = parseStackLine(line)
    if (result) return result
  }
  
  return DEFAULT_PARSE_RESULT
}

// Format location string for console output
function formatLocation(sourceFile: string, sourceLine: number | null, functionName: string | null): string {
  let location = sourceFile
  if (sourceLine) {
    location += ":" + String(sourceLine)
  }
  if (functionName) {
    location += " " + functionName
  }
  return "[" + location + "]"
}

// Console output for development
function consoleOutput(
  level: TraceLevel,
  message: string,
  sourceFile: string,
  sourceLine: number | null,
  functionName: string | null,
  payload?: Record<string, unknown>
) {
  const timestamp = new Date().toISOString()
  const prefix = "[" + timestamp + "] [" + level.toUpperCase() + "]"
  const location = formatLocation(sourceFile, sourceLine, functionName)
  const payloadStr = payload ? " " + JSON.stringify(payload) : ""
  console.log(prefix + " " + location + " " + message + payloadStr)
}

// Client-side trace function - sends to API
async function clientTrace(
  level: TraceLevel,
  message: string,
  options: TraceOptions = {}
): Promise<void> {
  const { sourceFile, sourceLine, functionName } = parseStackTrace()
  
  // Always log to console in development
  if (isDevelopment()) {
    consoleOutput(level, message, sourceFile, sourceLine, functionName, options.payload)
  }
  
  // Send to API (fire and forget)
  try {
    fetch("/api/trace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level,
        message,
        sourceFile,
        sourceLine,
        functionName,
        isClient: true,
        options,
      }),
    }).catch(() => {
      // Silently fail - don't break the app if tracing fails
    })
  } catch {
    // Silently fail
  }
}

// Server-side trace function - writes directly to database
async function serverTraceWrite(
  level: TraceLevel,
  message: string,
  options: TraceOptions = {}
): Promise<void> {
  // Dynamic import to avoid bundling server code on client
  const { serverTrace } = await import("./trace-logger")
  
  switch (level) {
    case "debug":
      serverTrace.debug(message, options)
      break
    case "info":
      serverTrace.info(message, options)
      break
    case "warn":
      serverTrace.warn(message, options)
      break
    case "error":
      serverTrace.error(message, options)
      break
  }
}

// Unified write function
function writeTrace(level: TraceLevel, message: string, options: TraceOptions = {}): void {
  if (isServer) {
    serverTraceWrite(level, message, options).catch(() => {})
  } else {
    clientTrace(level, message, options).catch(() => {})
  }
}

// Public API - unified trace object that works everywhere
export const trace = {
  debug: (message: string, options?: TraceOptions) => writeTrace("debug", message, options || {}),
  info: (message: string, options?: TraceOptions) => writeTrace("info", message, options || {}),
  warn: (message: string, options?: TraceOptions) => writeTrace("warn", message, options || {}),
  error: (message: string, options?: TraceOptions) => writeTrace("error", message, options || {}),
}

// Default export for convenience
export default trace
