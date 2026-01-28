"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, AlertCircle, Search, ChevronLeft, ChevronRight, Eye, User } from "lucide-react"
import { fetchVideoViewLogs } from "@/lib/actions"
import type { VideoViewLog } from "@/lib/actions/videos"
import { formatDistanceToNow } from "date-fns"

const ITEMS_PER_PAGE = 25

export default function ViewLogDashboard() {
  const [logs, setLogs] = useState<VideoViewLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1) // Reset to first page on search
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchVideoViewLogs(currentPage, ITEMS_PER_PAGE, debouncedSearch)
      if (result.success && result.data) {
        setLogs(result.data)
        setTotalCount(result.totalCount || 0)
      }
    } catch (error) {
      console.error("Failed to load view logs:", error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, debouncedSearch])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      relative: formatDistanceToNow(date, { addSuffix: true }),
      absolute: date.toLocaleString(),
    }
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
          {totalCount} view{totalCount !== 1 ? "s" : ""} total
          {debouncedSearch && ` matching "${debouncedSearch}"`}
        </span>
        {totalPages > 1 && (
          <span>
            Page {currentPage} of {totalPages}
          </span>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-500" />
            <p className="text-gray-400">Loading view logs...</p>
          </CardContent>
        </Card>
      ) : logs.length === 0 ? (
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
                {logs.map((log) => {
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
            <div className="flex items-center justify-center gap-2">
              <Button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-gray-400 px-4">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent disabled:opacity-50"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
