"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, AlertCircle, Search, ChevronLeft, ChevronRight, Eye, User, Loader2 } from "lucide-react"
import { fetchVideoViewLogs } from "@/lib/actions"
import { formatDistanceToNow } from "date-fns"

const ITEMS_PER_PAGE = 25

interface VideoViewLog {
  id: string
  video_id: string
  video_title: string
  categories: string[]
  user_id: string | null
  user_name: string | null
  user_email: string | null
  viewed_at: string
}

export default function ViewLogDashboard() {
  const [logs, setLogs] = useState<VideoViewLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1) // Reset to first page on search
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const data = await fetchVideoViewLogs()
      if (data && Array.isArray(data)) {
        setLogs(data)
      }
    } catch (error) {
      console.error("Failed to load view logs:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  // Client-side filtering
  const filteredLogs = useMemo(() => {
    if (!debouncedSearch) return logs

    const searchLower = debouncedSearch.toLowerCase()
    return logs.filter(
      (log) =>
        log.video_title.toLowerCase().includes(searchLower) ||
        log.user_name?.toLowerCase().includes(searchLower) ||
        log.user_email?.toLowerCase().includes(searchLower) ||
        log.categories.some((cat) => cat.toLowerCase().includes(searchLower))
    )
  }, [logs, debouncedSearch])

  // Client-side pagination
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE)
  const validCurrentPage = Math.max(1, Math.min(currentPage, totalPages || 1))

  const paginatedLogs = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredLogs.slice(startIndex, endIndex)
  }, [filteredLogs, validCurrentPage])

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch])

  const handlePageChange = (newPage: number) => {
    setCurrentPage(Math.max(1, Math.min(newPage, totalPages || 1)))
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      relative: formatDistanceToNow(date, { addSuffix: true }),
      absolute: date.toLocaleString(),
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
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
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search video or user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-gray-200 placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>
          Showing {filteredLogs.length === 0 ? 0 : (validCurrentPage - 1) * ITEMS_PER_PAGE + 1}-
          {Math.min(validCurrentPage * ITEMS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length} views
          {debouncedSearch && ` matching "${debouncedSearch}"`}
        </span>
      </div>

      {/* Table */}
      {filteredLogs.length === 0 ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-4 text-gray-500" />
            <p className="text-gray-400">
              {debouncedSearch ? "No view logs match your search" : "No video views recorded yet"}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {debouncedSearch
                ? "Try a different search term"
                : "View logs will appear here when users watch videos"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-3 text-sm font-medium text-gray-300">Date/Time</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-300">Video</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-300">Categories</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-300">User</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map((log) => {
                  const { relative, absolute } = formatDateTime(log.viewed_at)
                  return (
                    <tr key={log.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="p-3">
                        <div className="text-sm text-gray-300">{relative}</div>
                        <div className="text-xs text-gray-500">{absolute}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-purple-400 flex-shrink-0" />
                          <span className="text-sm text-gray-300">{log.video_title}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {log.categories.length > 0 ? (
                            log.categories.map((category) => (
                              <Badge
                                key={category}
                                variant="outline"
                                className="text-xs bg-gray-700/50 text-gray-300 border-gray-600"
                              >
                                {category}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        {log.user_id ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            <div>
                              <div className="text-sm text-gray-300">
                                {log.user_name || log.user_email?.split("@")[0] || "Unknown"}
                              </div>
                              {log.user_email && (
                                <div className="text-xs text-gray-500 font-mono">{log.user_email}</div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 italic">Anonymous</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">
                  Page {validCurrentPage} of {totalPages}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handlePageChange(validCurrentPage - 1)}
                  disabled={validCurrentPage === 1}
                  variant="outline"
                  size="sm"
                  className="bg-black/50 border-gray-700 text-white hover:bg-gray-700"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  onClick={() => handlePageChange(validCurrentPage + 1)}
                  disabled={validCurrentPage === totalPages}
                  variant="outline"
                  size="sm"
                  className="bg-black/50 border-gray-700 text-white hover:bg-gray-700"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
