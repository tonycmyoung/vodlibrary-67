"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import CategoryFilter from "@/components/category-filter"
import SortControl from "@/components/sort-control"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Search, Trash2, Clock, Loader2, Pencil, Plus, Filter, X, ChevronDown, ChevronUp } from "lucide-react"
import VideoModal from "./video-modal"
import { formatShortDate } from "@/lib/utils/date"
import { getBatchVideoViewCounts, getBatchVideoLastViewed } from "@/lib/actions/videos"

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
  last_viewed_at: string | null
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
  const [categories, setCategories] = useState<Category[]>([])
  const [performers, setPerformers] = useState<Performer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedPerformers, setSelectedPerformers] = useState<string[]>([])
  const [selectedRecorded, setSelectedRecorded] = useState<string[]>([])
  const [selectedPublished, setSelectedPublished] = useState<string[]>([])
  const [filterMode, setFilterMode] = useState<"AND" | "OR">("OR")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [filtersCollapsed, setFiltersCollapsed] = useState(true)

  const [sortBy, setSortBy] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("adminVideoManagement_sortBy") || "category"
    }
    return "category"
  })

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("adminVideoManagement_sortOrder") as "asc" | "desc") || "asc"
    }
    return "asc"
  })

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    const loadData = async () => {
      if (!mounted) return
      setLoading(true)

      try {
        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("categories")
          .select("*")
          .order("name")

        if (categoriesError) {
          console.error("Error fetching categories:", categoriesError)
        } else if (mounted) {
          setCategories(categoriesData || [])
        }

        // Fetch performers
        const { data: performersData, error: performersError } = await supabase
          .from("performers")
          .select("*")
          .order("name")

        if (performersError) {
          console.error("Error fetching performers:", performersError)
        } else if (mounted) {
          setPerformers(performersData || [])
        }

        // Fetch videos
        const { data: videosData, error: videosError } = await supabase
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

        if (videosError) {
          console.error("Error fetching videos:", videosError)
        } else if (mounted) {
          const videosWithCategoriesAndPerformers = videosData?.map((video: any) => ({
            ...video,
            views: 0,
            last_viewed_at: null,
            categories:
              video.video_categories?.map((vc: any) => vc.categories).filter((cat: any) => cat && cat.id) || [],
            performers:
              video.video_performers?.map((vp: any) => vp.performers).filter((perf: any) => perf && perf.id) || [],
          }))

          const videoIds = videosWithCategoriesAndPerformers?.map((video: any) => video.id) || []

          const [viewCounts, lastViewedTimes] = await Promise.all([
            getBatchVideoViewCounts(videoIds),
            getBatchVideoLastViewed(videoIds),
          ])

          const videosWithViewData = videosWithCategoriesAndPerformers?.map((video: any) => ({
            ...video,
            views: viewCounts[video.id] || 0,
            last_viewed_at: lastViewedTimes[video.id] || null,
          }))

          setVideos(videosWithViewData || [])
        }
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      mounted = false
    }
  }, [])

  const recordedValues = useMemo(() => {
    const values = videos.map((v) => v.recorded).filter((r): r is string => r !== null && r !== "")
    return Array.from(new Set(values)).sort()
  }, [videos])

  const filteredVideos = useMemo(() => {
    let filtered = [...videos]

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (video) =>
          video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.performers.some((performer) => performer.name.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    }

    // Apply category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((video) => {
        const videoCategories = video.categories.map((cat) => cat.id)
        if (filterMode === "AND") {
          return selectedCategories.every((selectedId) => videoCategories.includes(selectedId))
        } else {
          return selectedCategories.some((selectedId) => videoCategories.includes(selectedId))
        }
      })
    }

    // Apply performer filter
    if (selectedPerformers.length > 0) {
      filtered = filtered.filter((video) => {
        const videoPerformers = video.performers.map((perf) => perf.id)
        if (filterMode === "AND") {
          return selectedPerformers.every((selectedId) => videoPerformers.includes(selectedId))
        } else {
          return selectedPerformers.some((selectedId) => videoPerformers.includes(selectedId))
        }
      })
    }

    // Apply recorded date filter
    if (selectedRecorded.length > 0) {
      filtered = filtered.filter((video) => {
        return selectedRecorded.includes(video.recorded || "")
      })
    }

    // Apply published status filter
    if (selectedPublished.length > 0) {
      filtered = filtered.filter((video) => {
        const isPublished = video.is_published ? "published" : "draft"
        return selectedPublished.includes(isPublished)
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case "title":
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case "created_at":
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        case "recorded":
          aValue = a.recorded || ""
          bValue = b.recorded || ""
          break
        case "category":
          aValue = a.categories.length > 0 ? a.categories[0].name.toLowerCase() : "zzz_uncategorized"
          bValue = b.categories.length > 0 ? b.categories[0].name.toLowerCase() : "zzz_uncategorized"
          break
        case "performers":
          aValue = a.performers.length > 0 ? a.performers[0].name.toLowerCase() : "zzz_no_performer"
          bValue = b.performers.length > 0 ? b.performers[0].name.toLowerCase() : "zzz_no_performer"
          break
        case "views":
          aValue = a.views || 0
          bValue = b.views || 0
          break
        case "last_viewed_at":
          aValue = a.last_viewed_at ? new Date(a.last_viewed_at).getTime() : 0
          bValue = b.last_viewed_at ? new Date(b.last_viewed_at).getTime() : 0
          break
        case "published":
          aValue = a.is_published ? 1 : 0
          bValue = b.is_published ? 1 : 0
          break
        default:
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1
      return 0
    })

    return filtered
  }, [
    videos,
    searchQuery,
    selectedCategories,
    selectedPerformers,
    selectedRecorded,
    selectedPublished,
    filterMode,
    sortBy,
    sortOrder,
  ])

  const paginatedVideos = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredVideos.slice(startIndex, endIndex)
  }, [filteredVideos, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredVideos.length / itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [
    searchQuery,
    selectedCategories,
    selectedPerformers,
    selectedRecorded,
    selectedPublished,
    filterMode,
    sortBy,
    sortOrder,
  ])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("adminVideoManagement_sortBy", sortBy)
      localStorage.setItem("adminVideoManagement_sortOrder", sortOrder)
    }
  }, [sortBy, sortOrder])

  const handleSortChange = (newSortBy: string, newSortOrder: "asc" | "desc") => {
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
  }

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

    const supabase = createClient()
    try {
      const { error } = await supabase.from("videos").delete().eq("id", videoId)
      if (error) throw error

      const { data: videosData } = await supabase
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

      const videosWithCategoriesAndPerformers = videosData?.map((video: any) => ({
        ...video,
        views: 0,
        last_viewed_at: null,
        categories: video.video_categories?.map((vc: any) => vc.categories).filter((cat: any) => cat && cat.id) || [],
        performers:
          video.video_performers?.map((vp: any) => vp.performers).filter((perf: any) => perf && perf.id) || [],
      }))

      const videoIds = videosWithCategoriesAndPerformers?.map((video: any) => video.id) || []

      const [viewCounts, lastViewedTimes] = await Promise.all([
        getBatchVideoViewCounts(videoIds),
        getBatchVideoLastViewed(videoIds),
      ])

      const videosWithViewData = videosWithCategoriesAndPerformers?.map((video: any) => ({
        ...video,
        views: viewCounts[video.id] || 0,
        last_viewed_at: lastViewedTimes[video.id] || null,
      }))

      setVideos(videosWithViewData || [])
    } catch (error) {
      console.error("Error deleting video:", error)
    }
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setEditingVideo(null)
  }

  const handleVideoSaved = async () => {
    const supabase = createClient()
    setLoading(true)

    try {
      const { data: videosData } = await supabase
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

      const videosWithCategoriesAndPerformers = videosData?.map((video: any) => ({
        ...video,
        views: 0,
        last_viewed_at: null,
        categories: video.video_categories?.map((vc: any) => vc.categories).filter((cat: any) => cat && cat.id) || [],
        performers:
          video.video_performers?.map((vp: any) => vp.performers).filter((perf: any) => perf && perf.id) || [],
      }))

      const videoIds = videosWithCategoriesAndPerformers?.map((video: any) => video.id) || []

      const [viewCounts, lastViewedTimes] = await Promise.all([
        getBatchVideoViewCounts(videoIds),
        getBatchVideoLastViewed(videoIds),
      ])

      const videosWithViewData = videosWithCategoriesAndPerformers?.map((video: any) => ({
        ...video,
        views: viewCounts[video.id] || 0,
        last_viewed_at: lastViewedTimes[video.id] || null,
      }))

      setVideos(videosWithViewData || [])
    } catch (error) {
      console.error("Error refreshing videos:", error)
    } finally {
      setLoading(false)
    }

    handleModalClose()
  }

  // Handler functions for filter and sort
  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  const handlePerformerToggle = (performerId: string) => {
    setSelectedPerformers((prev) =>
      prev.includes(performerId) ? prev.filter((id) => id !== performerId) : [...prev, performerId],
    )
  }

  const handleRecordedToggle = (recorded: string) => {
    setSelectedRecorded((prev) => (prev.includes(recorded) ? prev.filter((r) => r !== recorded) : [...prev, recorded]))
  }

  const handlePublishedToggle = (status: string) => {
    setSelectedPublished((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]))
  }

  const handleFilterModeChange = (mode: "AND" | "OR") => {
    setFilterMode(mode)
  }

  const clearAllFilters = () => {
    setSelectedCategories([])
    setSelectedPerformers([])
    setSelectedRecorded([])
    setSelectedPublished([])
    setSearchQuery("")
  }

  const activeFilterCount =
    selectedCategories.length + selectedPerformers.length + selectedRecorded.length + selectedPublished.length

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)

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

      <Card className="bg-black/60 border-gray-800">
        <CardHeader>
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="text-white">Videos ({videos.length})</CardTitle>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search videos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-400 focus:border-purple-500"
                  />
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="lg:hidden bg-black/50 border-gray-700 text-white hover:bg-gray-700 hover:text-white"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                      {activeFilterCount > 0 && (
                        <span className="ml-2 bg-purple-600 text-white text-xs rounded-full px-2 py-0.5">
                          {activeFilterCount}
                        </span>
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-sm max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-white">Filter Videos</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <CategoryFilter
                        categories={categories}
                        recordedValues={recordedValues}
                        performers={performers}
                        selectedCategories={selectedCategories}
                        onCategoryToggle={handleCategoryToggle}
                        videoCount={videos.length}
                        compact={true}
                      />
                      {selectedCategories.length > 1 && (
                        <div className="space-y-2">
                          <span className="text-sm text-gray-400">Filter mode:</span>
                          <div className="flex bg-black/50 rounded-lg p-1 border border-gray-700">
                            <Button
                              variant={filterMode === "AND" ? "default" : "ghost"}
                              size="sm"
                              onClick={() => handleFilterModeChange("AND")}
                              className={`text-xs px-3 py-1 flex-1 ${
                                filterMode === "AND"
                                  ? "bg-purple-600 text-white hover:bg-purple-700"
                                  : "text-gray-400 hover:text-white hover:bg-gray-800"
                              }`}
                            >
                              AND
                            </Button>
                            <Button
                              variant={filterMode === "OR" ? "default" : "ghost"}
                              size="sm"
                              onClick={() => handleFilterModeChange("OR")}
                              className={`text-xs px-3 py-1 flex-1 ${
                                filterMode === "OR"
                                  ? "bg-purple-600 text-white hover:bg-purple-700"
                                  : "text-gray-400 hover:text-white hover:bg-gray-800"
                              }`}
                            >
                              OR
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                <div className="flex-1 sm:flex-none">
                  <SortControl sortBy={sortBy} sortOrder={sortOrder} onSortChange={handleSortChange} />
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="hidden lg:block">
        <Card className="bg-black/60 border-gray-800">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Toggle button for collapse/expand */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setFiltersCollapsed(!filtersCollapsed)}
                  className="flex items-center gap-2 text-white font-semibold hover:text-purple-400 transition-colors"
                >
                  <h3>Filters</h3>
                  {filtersCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-gray-400 hover:text-white hover:bg-gray-800"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear All ({activeFilterCount})
                  </Button>
                )}
              </div>

              {!filtersCollapsed && (
                <>
                  <CategoryFilter
                    categories={categories}
                    recordedValues={recordedValues}
                    performers={performers}
                    selectedCategories={selectedCategories}
                    onCategoryToggle={handleCategoryToggle}
                    videoCount={videos.length}
                  />

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-400 uppercase">Status</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant={selectedPublished.includes("published") ? "default" : "outline"}
                        className={`cursor-pointer ${
                          selectedPublished.includes("published")
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "border-gray-600 text-gray-300 hover:bg-gray-800"
                        }`}
                        onClick={() => handlePublishedToggle("published")}
                      >
                        Published
                      </Badge>
                      <Badge
                        variant={selectedPublished.includes("draft") ? "default" : "outline"}
                        className={`cursor-pointer ${
                          selectedPublished.includes("draft")
                            ? "bg-yellow-600 text-white hover:bg-yellow-700"
                            : "border-gray-600 text-gray-300 hover:bg-gray-800"
                        }`}
                        onClick={() => handlePublishedToggle("draft")}
                      >
                        Draft
                      </Badge>
                    </div>
                  </div>

                  {selectedCategories.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">Filter mode:</span>
                      <div className="flex bg-black/50 rounded-lg p-1 border border-gray-700">
                        <Button
                          variant={filterMode === "AND" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => handleFilterModeChange("AND")}
                          className={`text-xs px-3 py-1 ${
                            filterMode === "AND"
                              ? "bg-purple-600 text-white hover:bg-purple-700"
                              : "text-gray-400 hover:text-white hover:bg-gray-800"
                          }`}
                        >
                          AND
                        </Button>
                        <Button
                          variant={filterMode === "OR" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => handleFilterModeChange("OR")}
                          className={`text-xs px-3 py-1 ${
                            filterMode === "OR"
                              ? "bg-purple-600 text-white hover:bg-purple-700"
                              : "text-gray-400 hover:text-white hover:bg-gray-800"
                          }`}
                        >
                          OR
                        </Button>
                      </div>
                      <span className="text-xs text-gray-500">
                        {filterMode === "AND"
                          ? "Videos must have ALL selected categories"
                          : "Videos can have ANY selected categories"}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Video List */}
      <Card className="bg-black/60 border-gray-800">
        <CardContent className="p-6">
          {filteredVideos.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-400">
                Showing {currentPage * itemsPerPage - itemsPerPage + 1}-{currentPage * itemsPerPage} of{" "}
                {filteredVideos.length} videos
                {activeFilterCount > 0 && ` (${activeFilterCount} filter${activeFilterCount !== 1 ? "s" : ""} active)`}
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
            {paginatedVideos.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">No videos found matching your criteria.</p>
                {activeFilterCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFilters}
                    className="mt-4 border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              paginatedVideos.map((video) => (
                <div
                  key={video.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-4 md:space-y-0"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 flex-1">
                    <div className="w-12 h-9 sm:w-16 sm:h-12 bg-gray-800 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
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

                    <div className="flex-1 min-w-0">
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
                        <p className="text-sm text-gray-300 mb-2 line-clamp-2">{video.description}</p>
                      )}

                      <div className="flex flex-col md:flex-row md:items-start md:justify-between space-y-2 md:space-y-0 md:space-x-4">
                        <div className="flex flex-col space-y-1 text-sm text-gray-400 md:min-w-[140px] md:max-w-[140px] lg:flex-row lg:items-center lg:space-x-4 lg:space-y-0 lg:min-w-0 lg:max-w-none">
                          {video.recorded && video.recorded !== "Unset" && <span>R: {video.recorded}</span>}
                          {video.performers.length > 0 && (
                            <span>P: {video.performers.map((p) => p.name).join(", ")}</span>
                          )}
                          <span>A: {formatShortDate(video.created_at)}</span>
                        </div>

                        <div className="flex flex-wrap gap-1 md:flex-1 md:justify-start lg:justify-start">
                          {video.categories.map((category) => {
                            if (!category || !category.id) return null
                            const hasValidColor =
                              category.color && category.color.startsWith("#") && category.color.length >= 7

                            return (
                              <Badge
                                key={category.id}
                                variant="outline"
                                className="text-xs border-gray-600"
                                style={
                                  hasValidColor
                                    ? {
                                        borderColor: category.color + "60",
                                        color: category.color,
                                      }
                                    : undefined
                                }
                              >
                                {category.name}
                              </Badge>
                            )
                          })}
                        </div>

                        <div className="flex flex-col items-end space-y-2 flex-shrink-0 md:min-w-[120px] md:max-w-[120px]">
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
                          {video.last_viewed_at && (
                            <div className="text-sm text-gray-400 font-medium">
                              Last Viewed: {formatShortDate(video.last_viewed_at)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
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
