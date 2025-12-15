"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trash2, RefreshCw, AlertCircle, CheckCircle, XCircle, LogIn, UserPlus, Mail, UserCheck } from "lucide-react"
import { fetchAuthDebugLogs, clearAuthDebugLogs } from "@/lib/actions"
import { formatDistanceToNow } from "date-fns"

interface DebugLog {
  id: string
  event_type: string
  user_email: string
  success: boolean
  error_message: string | null
  additional_data: any
  created_at: string
}

export default function DebugDashboard() {
  const [logs, setLogs] = useState<DebugLog[]>([])
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const loadLogs = async () => {
    setLoading(true)
    try {
      const data = await fetchAuthDebugLogs()
      if (data && Array.isArray(data)) {
        setLogs(data)
      }
    } catch (error) {
      console.error("Failed to load debug logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleClearLogs = async () => {
    setClearing(true)
    try {
      await clearAuthDebugLogs()
      setLogs([])
    } catch (error) {
      console.error("Failed to clear debug logs:", error)
    } finally {
      setClearing(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const toggleRow = (logId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedRows(newExpanded)
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "login_attempt":
        return <LogIn className="w-4 h-4 text-blue-500" />
      case "signup":
        return <UserPlus className="w-4 h-4 text-green-500" />
      case "email_confirmation":
        return <Mail className="w-4 h-4 text-purple-500" />
      case "approval":
        return <UserCheck className="w-4 h-4 text-amber-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getEventBadge = (eventType: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      login_attempt: { label: "Login", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
      signup: { label: "Signup", className: "bg-green-500/20 text-green-400 border-green-500/30" },
      email_confirmation: { label: "Email", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
      approval: { label: "Approval", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    }

    const variant = variants[eventType] || {
      label: eventType.replace("_", " "),
      className: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    }

    return (
      <Badge variant="outline" className={`text-xs ${variant.className}`}>
        {variant.label}
      </Badge>
    )
  }

  const getSuccessBadge = () => {
    return (
      <div className="flex items-center space-x-1">
        <CheckCircle className="w-4 h-4 text-green-500" />
        <span className="text-xs text-green-400">Success</span>
      </div>
    )
  }

  const getFailureBadge = () => {
    return (
      <div className="flex items-center space-x-1">
        <XCircle className="w-4 h-4 text-red-500" />
        <span className="text-xs text-red-400">Error</span>
      </div>
    )
  }

  const getResultBadge = (success: boolean) => {
    return success ? getSuccessBadge() : getFailureBadge()
  }

  const getKeyAdditionalData = (additionalData: any) => {
    if (!additionalData) return null

    // Show failure_reason if it exists
    if (additionalData.failure_reason) {
      return <span className="text-xs text-amber-400">Reason: {additionalData.failure_reason}</span>
    }

    // Show user_exists status if it exists
    if (additionalData.user_exists !== undefined) {
      return <span className="text-xs text-gray-400">User exists: {additionalData.user_exists ? "Yes" : "No"}</span>
    }

    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
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
          <Button onClick={handleClearLogs} disabled={clearing || logs.length === 0} variant="destructive" size="sm">
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Logs
          </Button>
        </div>
        <div className="text-sm text-gray-400">
          {logs.length} log{logs.length !== 1 ? "s" : ""} total
        </div>
      </div>

      {loading ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-500" />
            <p className="text-gray-400">Loading debug logs...</p>
          </CardContent>
        </Card>
      ) : logs.length === 0 ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-4 text-gray-500" />
            <p className="text-gray-400">No debug logs found</p>
            <p className="text-sm text-gray-500 mt-2">Logs will appear here when users attempt to sign in or sign up</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-3 text-sm font-medium text-gray-300">Date/Time</th>
                <th className="text-left p-3 text-sm font-medium text-gray-300">Event</th>
                <th className="text-left p-3 text-sm font-medium text-gray-300">Result</th>
                <th className="text-left p-3 text-sm font-medium text-gray-300">Email</th>
                <th className="text-left p-3 text-sm font-medium text-gray-300">Error / Details</th>
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
                      <div className="text-sm text-gray-300">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </div>
                      <div className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        {getEventIcon(log.event_type)}
                        {getEventBadge(log.event_type)}
                      </div>
                    </td>
                    <td className="p-3">{getResultBadge(log.success)}</td>
                    <td className="p-3">
                      <div className="text-sm text-gray-300 font-mono">{log.user_email}</div>
                    </td>
                    <td className="p-3">
                      {log.error_message ? (
                        <div className="text-sm text-red-400">{log.error_message}</div>
                      ) : (
                        <div className="text-sm text-gray-500">{getKeyAdditionalData(log.additional_data) || "-"}</div>
                      )}
                    </td>
                  </tr>
                  {expandedRows.has(log.id) && log.additional_data && (
                    <tr key={`${log.id}-expanded`} className="border-b border-gray-800 bg-gray-800/30">
                      <td colSpan={5} className="p-3">
                        <div className="bg-gray-700/50 rounded-md p-3">
                          <p className="text-sm font-medium text-gray-300 mb-2">Additional Data</p>
                          <pre className="text-xs text-gray-400 font-mono overflow-x-auto">
                            {JSON.stringify(log.additional_data, null, 2)}
                          </pre>
                          <p className="text-xs text-gray-500 mt-2">Log ID: {log.id}</p>
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
