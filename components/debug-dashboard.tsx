"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trash2, RefreshCw, AlertCircle, CheckCircle, XCircle } from "lucide-react"
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

  const getStatusIcon = (success: boolean) => {
    return success ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />
  }

  const getStatusBadge = (success: boolean) => {
    return (
      <Badge variant={success ? "default" : "destructive"} className="text-xs">
        {success ? "Success" : "Failed"}
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
        <div className="space-y-4">
          {logs.map((log) => (
            <Card key={log.id} className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(log.success)}
                    <CardTitle className="text-lg text-white">
                      {log.event_type.charAt(0).toUpperCase() + log.event_type.slice(1).replace("_", " ")}
                    </CardTitle>
                    {getStatusBadge(log.success)}
                  </div>
                  <div className="text-sm text-gray-400">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </div>
                </div>
                <CardDescription className="text-gray-300">
                  Email: <span className="font-mono text-purple-400">{log.user_email}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {log.error_message && (
                  <div className="bg-red-900/20 border border-red-800 rounded-md p-3">
                    <div className="flex items-start space-x-2">
                      <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-400">Error Message</p>
                        <p className="text-sm text-red-300 mt-1">{log.error_message}</p>
                      </div>
                    </div>
                  </div>
                )}
                {log.additional_data && (
                  <div className="bg-gray-700/50 rounded-md p-3">
                    <p className="text-sm font-medium text-gray-300 mb-2">Additional Data</p>
                    <pre className="text-xs text-gray-400 font-mono overflow-x-auto">
                      {JSON.stringify(log.additional_data, null, 2)}
                    </pre>
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  Log ID: {log.id} • {new Date(log.created_at).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
