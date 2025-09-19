"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Trash2, Clock, Loader2, Pencil, Plus } from "lucide-react"
import VideoModal from "./video-modal"
import { formatShortDate } from "@/lib/utils/date"

interface Video {
  id: string
  title: string
  description: string | null
  video_url: string
  thumbnail_url: string | null
  duration_seconds: number | null
  is_published: boolean
  created_at: string
  recorded: string | null
  views: number | null
  categories: Array<{
    id: string
    name: string
    color: string
  }>
  performers: Array<{
    id: string
    name: string
  }>
}

interface Category {
  id: string
  name: string
  color: string
}

interface Performer {
  id: string
  name: string
}

export default function VideoManagement() {
  const [videos, setVideos] = useState<Video[]>([])
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([])
  const [paginatedVideos, setPaginatedVideos] = useState<Video[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [categories, setCategories] = useState<Category[]>([])
  const [performers, setPerformers] = useState<Performer[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)

  const supabase = createClient()

  // Fetch functions
  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase.from("categories").select("*").order("name")
    if (error) {
      console.error("Error fetching categories:", error)
      return
    }
    setCategories(data || [])
  }, [supabase])

  const fetchPerformers = useCallback(async () => {
    const { data, error } = await supabase.from("performers").select("*").order("name")
    if (error) {
      console.error("Error fetching performers:", error)
      return
    }
    setPerformers(data || [])
  }, [supabase])

  const fetchVideos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select(`
          *,
          video_categories(
            categories(id, name, color)
          ),
          video_performers(
            performers(id, name)
          )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      const videosWithCategoriesAndPerformers = data?.map((video: any) => ({
        ...video,
        categories: video.video_categories?.map((vc: any) => vc.categories).filter((cat: any) => cat && cat.id) || [],
        performers:
          video.video_performers?.map((vp: any) => vp.performers).filter((perf: any) => perf && perf.id) || [],
      }))

      setVideos(videosWithCategoriesAndPerformers || [])
    } catch (error) {
      console.error("Error fetching videos:", error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Effects
  useEffect(() => {
    fetchVideos()
    fetchCategories()
    fetchPerformers()
  }, [fetchVideos, fetchCategories, fetchPerformers])

  useEffect(() => {
    let filtered = videos
    if (searchQuery) {
      filtered = videos.filter(
        (video) =>
          video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.performers.some((performer) => performer.name.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    }

    // Sort by category
    filtered.sort((a, b) => {
      const aCats = a.categories.length > 0 ? a.categories[0].name.toLowerCase() : "zzz_uncategorized"
      const bCats = b.categories.length > 0 ? b.categories[0].name.toLowerCase() : "zzz_uncategorized"
      const result = aCats < bCats ? -1 : aCats > bCats ? 1 : 0
      if (result === 0) {
        return a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1
      }
      return result
    })

    setFilteredVideos(filtered)
    setCurrentPage(1)
  }, [videos, searchQuery])

  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    setPaginatedVideos(filteredVideos.slice(startIndex, endIndex))
  }, [filteredVideos, currentPage, itemsPerPage])

  // Event handlers
  const handleAddVideo = () => {
    setEditingVideo(null)
    setModalOpen(true)
  }

  const handleEditVideo = (video: Video) => {
    setEditingVideo(video)
    setModalOpen(true)
  }

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm("Are you sure you want to delete this video?")) return

    try {
      const { error } = await supabase.from("videos").delete().eq("id", videoId)
      if (error) throw error
      await fetchVideos()
    } catch (error) {
      console.error("Error deleting video:", error)
    }
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setEditingVideo(null)
  }

  const handleVideoSaved = () => {
    fetchVideos()
    handleModalClose()
  }

  // Pagination
  const totalPages = Math.ceil(filteredVideos.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, filteredVideos.length)

  const handlePageChange = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(validPage)
  }

  // Utility functions

  if (loading) {
    return (
      <Card className="bg-black/60 border-gray-800">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            <span className="ml-2 text-gray-300">Loading videos...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-black/60 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Video Management</CardTitle>
            <Button onClick={handleAddVideo} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Video
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Search */}
      <Card className="bg-black/60 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Videos ({videos.length})</CardTitle>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-400 focus:border-purple-500"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Video List */}
      <Card className="bg-black/60 border-gray-800">
        <CardContent className="p-6">
          {filteredVideos.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-400">
                Showing {startIndex + 1}-{endIndex} of {filteredVideos.length} videos
              </p>
              {totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            {paginatedVideos.map((video) => (
              <div
                key={video.id}
                className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-12 bg-gray-800 rounded flex items-center justify-center overflow-hidden">
                    {video.thumbnail_url ? (
                      <img
                        src={video.thumbnail_url || "/placeholder.svg"}
                        alt={video.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = "none"
                          target.nextElementSibling?.classList.remove("hidden")
                        }}
                      />
                    ) : null}
                    <div className={`flex items-center justify-center ${video.thumbnail_url ? "hidden" : ""}`}>
                      <Clock className="w-6 h-6 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-white">{video.title}</h4>
                      <Badge
                        variant={video.is_published ? "default" : "outline"}
                        className={
                          video.is_published
                            ? "bg-green-600 text-white"
                            : "border-yellow-600 text-yellow-400 bg-transparent"
                        }
                      >
                        {video.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    {video.description && (
                      <p className="text-sm text-gray-300 mb-2 line-clamp-2 max-w-md">{video.description}</p>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      {video.recorded && video.recorded !== "Unset" && <span>Recorded: {video.recorded}</span>}
                      {video.performers.length > 0 && (
                        <span>Performers: {video.performers.map((p) => p.name).join(", ")}</span>
                      )}
                      <span>Added {formatShortDate(video.created_at)}</span>
                      <div className="flex flex-wrap gap-1">
                        {video.categories.map((category) =>
                          category && category.id ? (
                            <Badge
                              key={category.id}
                              variant="outline"
                              className="text-xs border-gray-600"
                              style={{
                                borderColor: category.color ? category.color + "60" : "#6b7280",
                                color: category.color || "#9ca3af",
                              }}
                            >
                              {category.name}
                            </Badge>
                          ) : null,
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-2">
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditVideo(video)}
                      className="hover:bg-gray-700"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteVideo(video.id)}
                      className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="text-sm text-gray-400 font-medium">{video.views || 0} views</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <VideoModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSave={handleVideoSaved}
        editingVideo={editingVideo}
        categories={categories}
        performers={performers}
      />
    </div>
  )
}
