"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Trash2,
  RefreshCw,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Settings,
  Bug,
  Info,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import {
  fetchTraceLogs,
  clearTraceLogs,
  fetchTraceSettings,
  updateTraceSettings,
  getTraceCategories,
  formatTraceLogsForClipboard,
  type TraceLogsFilter,
} from "@/lib/actions/trace"
import type { TraceLogEntry, TraceSettings, TraceLevel } from "@/lib/trace-logger"
import { formatDistanceToNow } from "date-fns"
import { trace } from "@/lib/trace"

export default function TraceDashboard() {
  const [logs, setLogs] = useState<TraceLogEntry[]>([])
  const [settings, setSettings] = useState<TraceSettings | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Filter state
  const [filter, setFilter] = useState<TraceLogsFilter>({
    level: "all",
    limit: 200,
  })

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const [logsData, settingsData, categoriesData] = await Promise.all([
        fetchTraceLogs(filter),
        fetchTraceSettings(),
        getTraceCategories(),
      ])
      setLogs(logsData)
      setSettings(settingsData)
      setCategories(categoriesData)
    } catch (error) {
      console.error("Failed to load trace logs:", error)
    } finally {
      setLoading(false)
    }
  }, [filter])

  const handleClearLogs = async () => {
    setClearing(true)
    try {
      await clearTraceLogs()
      setLogs([])
    } catch (error) {
      console.error("Failed to clear trace logs:", error)
    } finally {
      setClearing(false)
    }
  }

  const handleCopyToClipboard = async () => {
    setCopying(true)
    try {
      const formatted = await formatTraceLogsForClipboard(logs)
      await navigator.clipboard.writeText(formatted)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
    } finally {
      setCopying(false)
    }
  }

  const handleUpdateSettings = async (updates: Partial<Pick<TraceSettings, "enabled" | "retention_days">>) => {
    setSavingSettings(true)
    try {
      await updateTraceSettings(updates)
      setSettings((prev) => prev ? { ...prev, ...updates } : prev)
    } catch (error) {
      console.error("Failed to update settings:", error)
    } finally {
      setSavingSettings(false)
    }
  }

  useEffect(() => {
    // Client-side trace test - logs when dashboard mounts
    trace.info("Trace dashboard mounted", { category: "admin", payload: { source: "client-side" } })
    loadLogs()
  }, [loadLogs])

  // Auto-refresh every 5 seconds when enabled
  useEffect(() => {
    if (autoRefresh === false) return
    const interval = setInterval(loadLogs, 5000)
    return () => clearInterval(interval)
  }, [autoRefresh, loadLogs])

  const toggleRow = (logId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedRows(newExpanded)
  }

  const getLevelIcon = (level: TraceLevel) => {
    switch (level) {
      case "debug":
        return <Bug className="w-4 h-4 text-gray-400" />
      case "info":
        return <Info className="w-4 h-4 text-blue-400" />
      case "warn":
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />
      case "error":
        return <XCircle className="w-4 h-4 text-red-400" />
    }
  }

  const getLevelBadge = (level: TraceLevel) => {
    const variants: Record<TraceLevel, { className: string }> = {
      debug: { className: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
      info: { className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
      warn: { className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
      error: { className: "bg-red-500/20 text-red-400 border-red-500/30" },
    }

    return (
      <Badge variant="outline" className={`text-xs uppercase ${variants[level].className}`}>
        {level}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Settings Panel */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader
          className="cursor-pointer"
          onClick={() => setShowSettings(!showSettings)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-400" />
              <CardTitle className="text-lg text-white">Trace Settings</CardTitle>
            </div>
            {showSettings ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </CardHeader>
        {showSettings && (
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="trace-enabled" className="text-gray-300">
                  Tracing Enabled
                </Label>
                <p className="text-sm text-gray-500">
                  When disabled, no new trace logs will be recorded
                </p>
              </div>
              <Switch
                id="trace-enabled"
                checked={settings?.enabled ?? true}
                onCheckedChange={(enabled) => handleUpdateSettings({ enabled })}
                disabled={savingSettings}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="retention-days" className="text-gray-300">
                  Retention Period (days)
                </Label>
                <p className="text-sm text-gray-500">
                  Logs older than this will be automatically deleted (0 = never)
                </p>
              </div>
              <Select
                value={String(settings?.retention_days ?? 7)}
                onValueChange={(value) => handleUpdateSettings({ retention_days: Number.parseInt(value, 10) })}
                disabled={savingSettings}
              >
                <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="0">Never</SelectItem>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Filters */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-gray-300 mb-2 block">Level</Label>
              <Select
                value={filter.level || "all"}
                onValueChange={(value) => setFilter((f) => ({ ...f, level: value as TraceLevel | "all" }))}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300 mb-2 block">Category</Label>
              <Select
                value={filter.category || "all"}
                onValueChange={(value) => setFilter((f) => ({ ...f, category: value === "all" ? undefined : value }))}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300 mb-2 block">Search</Label>
              <Input
                placeholder="Search messages, files..."
                value={filter.search || ""}
                onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value || undefined }))}
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
              />
            </div>
            <div>
              <Label className="text-gray-300 mb-2 block">Limit</Label>
              <Select
                value={String(filter.limit || 200)}
                onValueChange={(value) => setFilter((f) => ({ ...f, limit: Number.parseInt(value, 10) }))}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={loadLogs}
            disabled={loading}
            variant="outline"
            size="sm"
            className="border-purple-600 text-purple-400 hover:bg-purple-600/10 bg-transparent"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={handleClearLogs}
            disabled={clearing || logs.length === 0}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Purge All
          </Button>
          <Button
            onClick={handleCopyToClipboard}
            disabled={copying || logs.length === 0}
            variant="outline"
            size="sm"
            className="border-blue-600 text-blue-400 hover:bg-blue-600/10 bg-transparent"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy to Clipboard
              </>
            )}
          </Button>
          <div className="flex items-center gap-2 ml-4">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <Label htmlFor="auto-refresh" className="text-sm text-gray-400">
              Auto-refresh (5s)
            </Label>
          </div>
        </div>
        <div className="text-sm text-gray-400">
          {logs.length} {logs.length === 1 ? "log" : "logs"} total
          {settings && settings.enabled === false && (
            <span className="ml-2 text-yellow-400">(Tracing disabled)</span>
          )}
        </div>
      </div>

      {/* Logs Table */}
      {loading && logs.length === 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-4 text-gray-400 animate-spin" />
            <p className="text-gray-400">Loading trace logs...</p>
          </CardContent>
        </Card>
      )}
      {loading === false && logs.length === 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-4 text-gray-500" />
            <p className="text-gray-400">No trace logs found</p>
            <p className="text-sm text-gray-500 mt-2">
              Use trace.info(), trace.debug(), etc. in your code to add logs
            </p>
          </CardContent>
        </Card>
      )}
      {logs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-3 text-sm font-medium text-gray-300 w-8"></th>
                <th className="text-left p-3 text-sm font-medium text-gray-300">Time</th>
                <th className="text-left p-3 text-sm font-medium text-gray-300">Level</th>
                <th className="text-left p-3 text-sm font-medium text-gray-300">Source File</th>
                <th className="text-left p-3 text-sm font-medium text-gray-300">Message</th>
                <th className="text-left p-3 text-sm font-medium text-gray-300">Category</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer"
                    onClick={() => toggleRow(log.id)}
                  >
                    <td className="p-3">
                      {expandedRows.has(log.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </td>
                    <td className="p-3">
                      <div className="text-sm text-gray-300">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {getLevelIcon(log.level)}
                        {getLevelBadge(log.level)}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${log.is_client ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "bg-orange-500/20 text-orange-400 border-orange-500/30"}`}
                        >
                          {log.is_client ? "Client" : "Server"}
                        </Badge>
                        <div className="text-sm text-gray-300 font-mono truncate max-w-xs">
                          {log.source_file}
                          {log.source_line && <span className="text-gray-500">:{log.source_line}</span>}
                        </div>
                      </div>
                      {log.function_name && (
                        <div className="text-xs text-gray-500 font-mono ml-16">
                          {log.function_name}()
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="text-sm text-gray-300 truncate max-w-md">
                        {log.message}
                      </div>
                    </td>
                    <td className="p-3">
                      {log.category && (
                        <Badge variant="outline" className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
                          {log.category}
                        </Badge>
                      )}
                    </td>
                  </tr>
                  {expandedRows.has(log.id) && (
                    <tr key={`${log.id}-expanded`} className="border-b border-gray-800 bg-gray-800/30">
                      <td colSpan={6} className="p-3">
                        <div className="bg-gray-700/50 rounded-md p-4 space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Environment:</span>
                              <span className="ml-2 text-gray-300">{log.environment}</span>
                            </div>
                            {log.user_email && (
                              <div>
                                <span className="text-gray-500">User:</span>
                                <span className="ml-2 text-gray-300">{log.user_email}</span>
                              </div>
                            )}
                            {log.session_id && (
                              <div>
                                <span className="text-gray-500">Session:</span>
                                <span className="ml-2 text-gray-300 font-mono text-xs">{log.session_id}</span>
                              </div>
                            )}
                            {log.request_id && (
                              <div>
                                <span className="text-gray-500">Request:</span>
                                <span className="ml-2 text-gray-300 font-mono text-xs">{log.request_id}</span>
                              </div>
                            )}
                          </div>
                          {log.payload && (
                            <div>
                              <p className="text-sm font-medium text-gray-300 mb-2">Payload</p>
                              <pre className="text-xs text-gray-400 font-mono overflow-x-auto bg-gray-800 p-3 rounded">
                                {JSON.stringify(log.payload, null, 2)}
                              </pre>
                            </div>
                          )}
                          <p className="text-xs text-gray-500">Log ID: {log.id}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
