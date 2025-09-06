"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { extractVideoMetadata } from "@/lib/video-utils"
import { saveVideo } from "@/lib/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Trash2, Clock, Loader2, Pencil } from "lucide-react"
import dynamic from "next/dynamic"

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

const VideoManagementClient = () => {
  console.log("[v0] VIDEO-MANAGEMENT - Component initializing")

  const supabase = createClient()

  const [videos, setVideos] = useState<any[]>([])
  const [filteredVideos, setFilteredVideos] = useState<any[]>([])
  const [paginatedVideos, setPaginatedVideos] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [categories, setCategories] = useState<any[]>([])
  const [performers, setPerformers] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [isAutoFilling, setIsAutoFilling] = useState(false)
  const [thumbnailError, setThumbnailError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    video_url: "",
    thumbnail_url: "",
    duration_seconds: "",
    is_published: true,
    recorded: "",
    category_ids: [] as string[],
    performer_ids: [] as string[],
  })

  useEffect(() => {
    console.log("[v0] VIDEO-MANAGEMENT - Initial data fetch useEffect")
    fetchVideos()
    fetchCategories()
    fetchPerformers()
  }, [])

  useEffect(() => {
    console.log(
      "[v0] VIDEO-MANAGEMENT - Filter videos useEffect, videos count:",
      videos.length,
      "search query:",
      searchQuery,
    )
    filterVideos()
  }, [videos, searchQuery])

  useEffect(() => {
    console.log("[v0] VIDEO-MANAGEMENT - Pagination useEffect")
    updatePaginatedVideos()
  }, [filteredVideos, currentPage, itemsPerPage])

  const filterVideos = () => {
    let filtered = videos

    if (searchQuery) {
      filtered = videos.filter(
        (video) =>
          video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.performers.some((performer) => performer.name.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    }

    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch ("category") {
        case "category":
          const aCats = a.categories.length > 0 ? a.categories[0].name.toLowerCase() : "zzz_uncategorized"
          const bCats = b.categories.length > 0 ? b.categories[0].name.toLowerCase() : "zzz_uncategorized"
          aValue = aCats
          bValue = bCats
          break
        case "title":
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case "created_at":
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        case "recorded":
          aValue = a.recorded === "Unset" || !a.recorded ? "" : a.recorded
          bValue = b.recorded === "Unset" || !b.recorded ? "" : b.recorded
          break
        case "performers":
          aValue = a.performers.length > 0 ? a.performers.map((p) => p.name).join(", ") : ""
          bValue = b.performers.length > 0 ? b.performers.map((p) => p.name).join(", ") : ""
          break
        default:
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
      }

      let result = 0
      if ("asc" === "asc") {
        result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        result = aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }

      if (result === 0 && "category" !== "title") {
        const aTitle = a.title.toLowerCase()
        const bTitle = b.title.toLowerCase()
        result = aTitle < bTitle ? -1 : aTitle > bTitle ? 1 : 0
      }

      return result
    })

    setFilteredVideos(filtered)
    setCurrentPage(1)
  }

  const updatePaginatedVideos = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    setPaginatedVideos(filteredVideos.slice(startIndex, endIndex))
  }

  const handlePageChange = (page: number) => {
    const totalPages = Math.ceil(filteredVideos.length / itemsPerPage)
    const validPage = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(validPage)
  }

  const handlePrevious = () => {
    handlePageChange(currentPage - 1)
  }

  const handleNext = () => {
    handlePageChange(currentPage + 1)
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      video_url: "",
      thumbnail_url: "",
      duration_seconds: "",
      is_published: true,
      recorded: "",
      category_ids: [],
      performer_ids: [],
    })
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()

    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      const videoData = {
        title: formData.title,
        description: formData.description || "",
        videoUrl: formData.video_url,
        thumbnailUrl: formData.thumbnail_url || "",
        performerId: formData.performer_ids[0] || "",
        categoryIds: formData.category_ids,
        performerIds: formData.performer_ids,
        durationSeconds: formData.duration_seconds ? Number.parseInt(formData.duration_seconds) : null,
        isPublished: formData.is_published,
        recorded: formData.recorded || null,
      }

      const result = await saveVideo(videoData)

      if (result.error) {
        console.error("Error saving video:", result.error)
        alert(`Error: ${result.error}`)
        return
      }

      await fetchVideos()
      resetForm()
    } catch (error) {
      console.error("Error saving video:", error)
      alert("An unexpected error occurred while saving the video")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (video: any) => {
    setFormData({
      title: video.title,
      description: video.description || "",
      video_url: video.video_url,
      thumbnail_url: video.thumbnail_url || "",
      duration_seconds: video.duration_seconds?.toString() || "",
      is_published: video.is_published,
      recorded: video.recorded === "Unset" ? "" : video.recorded || "",
      category_ids: video.categories.map((c: any) => c.id),
      performer_ids: video.performers.map((p: any) => p.id),
    })
  }

  const handleDelete = async (videoId: string) => {
    if (!confirm("Are you sure you want to delete this video?")) return

    try {
      const { error } = await supabase.from("videos").delete().eq("id", videoId)

      if (error) throw error

      await fetchVideos()
    } catch (error) {
      console.error("Error deleting video:", error)
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "Not set - click edit to add duration"
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const handleAutoFill = async () => {
    if (!formData.video_url) {
      alert("Please enter a video URL first")
      return
    }

    setIsAutoFilling(true)
    setThumbnailError(null)
    try {
      const metadata = await extractVideoMetadata(formData.video_url)

      const isGoogleDrive = formData.video_url.includes("drive.google.com")

      setFormData((prev: any) => ({
        ...prev,
        thumbnail_url: metadata.thumbnail || prev.thumbnail_url,
        duration_seconds: metadata.duration ? Math.round(metadata.duration).toString() : prev.duration_seconds,
      }))
    } catch (error) {
      console.error("Error extracting video metadata:", error)
      setThumbnailError("Could not extract video metadata. Please fill in manually.")
    } finally {
      setIsAutoFilling(false)
    }
  }

  const fetchCategories = async () => {
    const { data, error } = await supabase.from("categories").select("*").order("name")

    if (error) {
      console.error("Error fetching categories:", error)
      return
    }

    setCategories(data || [])
  }

  const fetchPerformers = async () => {
    const { data, error } = await supabase.from("performers").select("*").order("name")

    if (error) {
      console.error("Error fetching performers:", error)
      return
    }

    setPerformers(data || [])
  }

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select(
          `
          *,
          video_categories(
            categories(id, name, color)
          ),
          video_performers(
            performers(id, name)
          )
        `,
        )
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
  }

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

  const totalPages = Math.ceil(filteredVideos.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, filteredVideos.length)

  return (
    <div className="space-y-6">
      <Card className="bg-black/60 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Videos ({videos.length})</CardTitle>
            <div className="flex items-center space-x-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search videos..."
                  value={searchQuery}
                  onChange={(e: any) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-400 focus:border-purple-500"
                />
              </div>
              <Button onClick={resetForm} className="bg-purple-600 hover:bg-purple-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Video
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

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
                    onClick={handlePrevious}
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
                    onClick={handleNext}
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
            {paginatedVideos.map((video: any) => (
              <div
                key={video.id}
                className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700 py-1"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-12 bg-gray-800 rounded flex items-center justify-center overflow-hidden">
                    {video.thumbnail_url ? (
                      <img
                        src={video.thumbnail_url || "/placeholder.svg"}
                        alt={video.title}
                        className="w-full h-full object-cover"
                        onError={(e: any) => {
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
                      <p className="text-sm text-gray-300 mb-2 line-clamp-2 max-w-md w-auto">{video.description}</p>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      {video.recorded && video.recorded !== "Unset" && <span>Recorded: {video.recorded}</span>}
                      {video.performers.length > 0 && (
                        <span>Performers: {video.performers.map((p: any) => p.name).join(", ")}</span>
                      )}
                      <span>Added {formatDate(video.created_at)}</span>
                      <div className="flex flex-wrap gap-1">
                        {video.categories.map((category: any) =>
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
                      onClick={() => handleEdit(video)}
                      className="cursor-pointer hover:bg-gray-700"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(video.id)}
                      className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="text-sm text-gray-400 font-medium">{video.views || 0} views</div>
                </div>
              </div>
            ))}

            {filteredVideos.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-400">No videos found matching your search.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default dynamic(() => Promise.resolve(VideoManagementClient), {
  ssr: false,
  loading: () => (
    <Card className="bg-black/60 border-gray-800">
      <CardContent className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
          <span className="ml-2 text-gray-300">Loading...</span>
        </div>
      </CardContent>
    </Card>
  ),
})
