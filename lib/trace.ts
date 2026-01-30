// Unified trace logger - works in both client and server environments
// - Server: writes directly to database
// - Client: sends to /api/trace endpoint

import type { TraceLevel, TraceOptions } from "./trace-logger"

// Re-export types for convenience
export type { TraceLevel, TraceOptions, TraceLogEntry, TraceSettings } from "./trace-logger"

// Check if we're on the server
const isServer = typeof window === "undefined"

// Check if we're in development mode
const isDevelopment = () => process.env.NODE_ENV === "development"

// Parse stack trace to extract source info (works in both environments)
function parseStackTrace(): { sourceFile: string; sourceLine: number | null; functionName: string | null } {
  const error = new Error()
  const stack = error.stack || ""
  const lines = stack.split("\n")
  
  // Skip internal frames to find the actual caller
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i]
    // Skip trace.ts and trace-logger.ts frames
    if (line.includes("trace.ts") || line.includes("trace-logger")) continue
    
    // Parse stack line - handles various formats
    const match = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):\d+\)?/)
    if (match) {
      let functionName = match[1] || null
      let sourceFile = match[2] || "unknown"
      const sourceLine = match[3] ? parseInt(match[3], 10) : null
      
      // Clean up function name
      if (functionName) {
        functionName = functionName.replace(/^Object\./, "").replace(/^async\s+/, "")
      }
      
      // Clean up source file path - remove webpack internals
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
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`
  const location = `[${sourceFile}${sourceLine ? `:${sourceLine}` : ""}${functionName ? ` ${functionName}` : ""}]`
  const payloadStr = payload ? ` ${JSON.stringify(payload)}` : ""
  console.log(`${prefix} ${location} ${message}${payloadStr}`)
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
