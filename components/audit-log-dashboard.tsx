"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trash2, RefreshCw, AlertCircle, UserPlus, UserCheck, UserX } from "lucide-react"
import { fetchAuditLogs, clearAuditLogs } from "@/lib/actions"
import { formatDistanceToNow } from "date-fns"

interface AuditLog {
  id: string
  created_at: string
  actor_id: string
  actor_email: string
  action: string
  target_id: string | null
  target_email: string | null
  additional_data: any
}

export default function AuditLogDashboard() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)

  const loadLogs = async () => {
    setLoading(true)
    try {
      const data = await fetchAuditLogs()
      if (data && Array.isArray(data)) {
        setLogs(data)
      }
    } catch (error) {
      console.error("Failed to load audit logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleClearLogs = async () => {
    if (!globalThis.confirm("Are you sure you want to clear all audit logs? This action cannot be undone.")) {
      return
    }

    setClearing(true)
    try {
      await clearAuditLogs()
      setLogs([])
    } catch (error) {
      console.error("Failed to clear audit logs:", error)
    } finally {
      setClearing(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const getActionIcon = (action: string) => {
    switch (action) {
      case "user_signup":
        return <UserPlus className="w-4 h-4 text-blue-500" />
      case "user_approval":
        return <UserCheck className="w-4 h-4 text-green-500" />
      case "user_deletion":
        return <UserX className="w-4 h-4 text-red-500" />
      case "user_invitation":
        return <UserPlus className="w-4 h-4 text-amber-500" />
      case "password_reset":
        return <AlertCircle className="w-4 h-4 text-purple-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getActionBadge = (action: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      user_signup: { label: "Signup", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
      user_approval: { label: "Approval", className: "bg-green-500/20 text-green-400 border-green-500/30" },
      user_deletion: { label: "Deletion", className: "bg-red-500/20 text-red-400 border-red-500/30" },
      user_invitation: { label: "Invitation", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
      password_reset: { label: "Password Reset", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
    }

    const variant = variants[action] || { label: action, className: "bg-gray-500/20 text-gray-400 border-gray-500/30" }

    return (
      <Badge variant="outline" className={`text-xs ${variant.className}`}>
        {variant.label}
      </Badge>
    )
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
            <p className="text-gray-400">Loading audit logs...</p>
          </CardContent>
        </Card>
      ) : (
        <div>
          {logs.length === 0 ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-4 text-gray-500" />
                <p className="text-gray-400">No audit logs found</p>
                <p className="text-sm text-gray-500 mt-2">
                  Logs will appear here when users sign up, get approved, or are deleted
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-3 text-sm font-medium text-gray-300">Date/Time</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-300">Action</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-300">Actor</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-300">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="p-3">
                        <div className="text-sm text-gray-300">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </div>
                        <div className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          {getActionIcon(log.action)}
                          {getActionBadge(log.action)}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-gray-300">
                          {log.additional_data?.actor_name || log.actor_email.split("@")[0]}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">{log.actor_email}</div>
                      </td>
                      <td className="p-3">
                        {log.target_email ? (
                          <div>
                            <div className="text-sm text-gray-300">
                              {log.additional_data?.target_name || log.target_email.split("@")[0]}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">{log.target_email}</div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">-</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
