"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { getBatchVideoViewCounts, getBatchVideoLastViewed } from "@/lib/actions/videos"
import VideoModal from "@/components/video-modal"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Loader2, X, ChevronDown, ChevronUp, Plus, Pencil, Trash2, ArrowUpDown } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import CategoryFilter from "@/components/category-filter"

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
  curriculums: Array<{
    id: string
    name: string
    color: string
    display_order: number
  }>
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

interface Curriculum {
  id: string
  name: string
  color: string
  display_order: number
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
  const [curriculums, setCurriculums] = useState<Curriculum[]>([])
  const [performers, setPerformers] = useState<Performer[]>([])
  const [recordedValues, setRecordedValues] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedCurriculums, setSelectedCurriculums] = useState<string[]>([])
  const [filterMode, setFilterMode] = useState<"AND" | "OR">("OR")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [itemsPerPage] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return Number.parseInt(localStorage.getItem("adminVideoManagement_itemsPerPage") || "10", 10)
    }
    return 10
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("adminVideoManagement_sortBy") || "title"
    }
    return "title"
  })
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)

  const loadData = async () => {
    const supabase = createClient()
    setLoading(true)

    try {
      const { data: curriculumsData } = await supabase.from("curriculums").select("*").order("display_order")
      setCurriculums(curriculumsData || [])

      const { data: categoriesData } = await supabase.from("categories").select("*").order("name")
      setCategories(categoriesData || [])

      const { data: performersData } = await supabase.from("performers").select("*").order("name")
      setPerformers(performersData || [])

      const { data: videosData } = await supabase
        .from("videos")
        .select(`
          *,
          video_categories(categories(id, name, color)),
          video_curriculums(curriculums(id, name, color, display_order)),
          video_performers(performers(id, name))
        `)
        .order("created_at", { ascending: false })

      if (videosData) {
        const videosWithMetadata = videosData.map((video: any) => ({
          ...video,
          views: 0,
          last_viewed_at: null,
          categories: video.video_categories?.map((vc: any) => vc.categories) || [],
          curriculums: video.video_curriculums?.map((vc: any) => vc.curriculums) || [],
          performers: video.video_performers?.map((vp: any) => vp.performers) || [],
        }))

        const videoIds = videosWithMetadata.map((video: any) => video.id)
        const viewCounts = await getBatchVideoViewCounts(videoIds)
        const lastViewedDates = await getBatchVideoLastViewed(videoIds)

        const videosWithViewData = videosWithMetadata.map((video: any) => ({
          ...video,
          views: viewCounts[video.id] || 0,
          last_viewed_at: lastViewedDates[video.id] || null,
        }))

        setVideos(videosWithViewData)

        const uniqueRecorded = Array.from(
          new Set(videosWithViewData.map((v: any) => v.recorded).filter((r: any) => r)),
        ).sort((a, b) =>
          String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" }),
        ) as string[]
        setRecordedValues(uniqueRecorded)
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredVideos = useMemo(() => {
    let filtered = [...videos]

    if (searchQuery) {
      filtered = filtered.filter(
        (video) =>
          video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.performers.some((performer) => performer.name.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    }

    if (selectedCurriculums.length > 0) {
      filtered = filtered.filter((video) => {
        const videoCurriculums = new Set(video.curriculums.map((curr) => curr.id))
        if (filterMode === "AND") {
          return selectedCurriculums.every((selectedId) => videoCurriculums.has(selectedId))
        } else {
          return selectedCurriculums.some((selectedId) => videoCurriculums.has(selectedId))
        }
      })
    }

    const selectedCategoryIds = selectedCategories.filter(
      (id) => !id.startsWith("recorded:") && !id.startsWith("performer:"),
    )
    if (selectedCategoryIds.length > 0) {
      filtered = filtered.filter((video) => {
        const videoCategories = new Set(video.categories.map((cat) => cat.id))
        if (filterMode === "AND") {
          return selectedCategoryIds.every((selectedId) => videoCategories.has(selectedId))
        } else {
          return selectedCategoryIds.some((selectedId) => videoCategories.has(selectedId))
        }
      })
    }

    const selectedPerformerIds = selectedCategories
      .filter((id) => id.startsWith("performer:"))
      .map((id) => id.replace("performer:", ""))
    if (selectedPerformerIds.length > 0) {
      filtered = filtered.filter((video) => {
        const videoPerformers = new Set(video.performers.map((perf) => perf.id))
        if (filterMode === "AND") {
          return selectedPerformerIds.every((selectedId) => videoPerformers.has(selectedId))
        } else {
          return selectedPerformerIds.some((selectedId) => videoPerformers.has(selectedId))
        }
      })
    }

    const selectedRecordedValues = selectedCategories
      .filter((id) => id.startsWith("recorded:"))
      .map((id) => id.replace("recorded:", ""))
    if (selectedRecordedValues.length > 0) {
      filtered = filtered.filter((video) => selectedRecordedValues.includes(video.recorded || ""))
    }

    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case "title":
        default:
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case "created_at": {
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        }
        case "recorded": {
          aValue = a.recorded || ""
          bValue = b.recorded || ""
          break
        }
        case "curriculum": {
          if (a.curriculums.length === 0 && b.curriculums.length === 0) {
            aValue = Number.MAX_SAFE_INTEGER
            bValue = Number.MAX_SAFE_INTEGER
          } else if (a.curriculums.length > 0 && b.curriculums.length === 0) {
            aValue = a.curriculums.toSorted((x, y) => x.display_order - y.display_order)[0].display_order
            bValue = Number.MAX_SAFE_INTEGER
          } else if (a.curriculums.length === 0 && b.curriculums.length > 0) {
            aValue = Number.MAX_SAFE_INTEGER
            bValue = b.curriculums.toSorted((x, y) => x.display_order - y.display_order)[0].display_order
          } else {
            aValue = a.curriculums.toSorted((x, y) => x.display_order - y.display_order)[0].display_order
            bValue = b.curriculums.toSorted((x, y) => x.display_order - y.display_order)[0].display_order
          }
          break
        }
        case "category": {
          aValue = a.categories.length > 0 ? a.categories[0].name.toLowerCase() : "zzz"
          bValue = b.categories.length > 0 ? b.categories[0].name.toLowerCase() : "zzz"
          break
        }
        case "views": {
          aValue = a.views || 0
          bValue = b.views || 0
          break
        }
        case "last_viewed": {
          aValue = a.last_viewed_at ? new Date(a.last_viewed_at).getTime() : 0
          bValue = b.last_viewed_at ? new Date(b.last_viewed_at).getTime() : 0
          break
        }
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1

      // Secondary sort by title for all non-title sorts
      if (sortBy !== "title") {
        const aTitle = a.title.toLowerCase()
        const bTitle = b.title.toLowerCase()
        if (aTitle < bTitle) return -1
        if (aTitle > bTitle) return 1
      }

      return 0
    })

    return filtered
  }, [videos, searchQuery, selectedCategories, selectedCurriculums, filterMode, sortBy, sortOrder])

  const totalPages = Math.ceil(filteredVideos.length / itemsPerPage)
  const validCurrentPage = Math.max(1, Math.min(currentPage, totalPages || 1))

  const paginatedVideos = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredVideos.slice(startIndex, endIndex)
  }, [filteredVideos, validCurrentPage, itemsPerPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategories, selectedCurriculums, filterMode, sortBy, sortOrder])

  const handleCurriculumToggle = (curriculumId: string) => {
    setSelectedCurriculums((prev) =>
      prev.includes(curriculumId) ? prev.filter((id) => id !== curriculumId) : [...prev, curriculumId],
    )
  }

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  const handleSortChange = (value: string) => {
    setSortBy(value)
    localStorage.setItem("adminVideoManagement_sortBy", value)
  }

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(Math.max(1, Math.min(newPage, totalPages || 1)))
  }

  const clearAllFilters = () => {
    setSelectedCategories([])
    setSelectedCurriculums([])
    setSearchQuery("")
  }

  const handleAddVideo = () => {
    setEditingVideo(null)
    setIsModalOpen(true)
  }

  const handleEditVideo = (video: Video) => {
    setEditingVideo(video)
    setIsModalOpen(true)
  }

  const handleDeleteVideo = async (videoId: string) => {
    if (!globalThis.confirm("Are you sure you want to delete this video?")) return

    const supabase = createClient()
    const { error } = await supabase.from("videos").delete().eq("id", videoId)

    if (error) {
      console.error("Error deleting video:", error)
      alert("Failed to delete video")
    } else {
      await loadData()
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingVideo(null)
  }

  const handleModalSave = async () => {
    setIsModalOpen(false)
    setEditingVideo(null)
    await loadData()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  }

  const formatLastViewed = (dateString: string | null) => {
    if (!dateString) return "Never"
    return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  }

  const activeFilterCount = selectedCategories.length + selectedCurriculums.length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Video Management</h2>
        <Button onClick={handleAddVideo} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Video
        </Button>
      </div>

      {/* Search and Sort */}
      <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">Videos ({filteredVideos.length})</h3>
          </div>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 bg-black/50 border-gray-700 text-white"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <span className="text-sm text-gray-400 whitespace-nowrap">Sort by:</span>
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-40 bg-black/50 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="title" className="text-white">
                  Name
                </SelectItem>
                <SelectItem value="curriculum" className="text-white">
                  Curriculum
                </SelectItem>
                <SelectItem value="category" className="text-white">
                  Category
                </SelectItem>
                <SelectItem value="recorded" className="text-white">
                  Recorded
                </SelectItem>
                <SelectItem value="created_at" className="text-white">
                  Date Added
                </SelectItem>
                <SelectItem value="views" className="text-white">
                  Views
                </SelectItem>
                <SelectItem value="last_viewed" className="text-white">
                  Last View
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSortOrder}
              className="bg-black/50 border-gray-700 text-white hover:bg-gray-700"
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Collapsible Filters */}
      <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-4">
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <div className="flex items-center justify-between mb-4">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 text-gray-300 hover:text-white p-0">
                <h3 className="text-lg font-semibold">Filters</h3>
                {isFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {activeFilterCount > 0 && (
                  <span className="bg-red-600 text-white text-xs rounded-full px-2 py-0.5">{activeFilterCount}</span>
                )}
              </Button>
            </CollapsibleTrigger>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-red-400 hover:text-red-300">
                Clear all
              </Button>
            )}
          </div>

          <CollapsibleContent className="space-y-4">
            <CategoryFilter
              categories={categories}
              recordedValues={recordedValues}
              performers={performers}
              selectedCategories={selectedCategories}
              onCategoryToggle={handleCategoryToggle}
              videoCount={filteredVideos.length}
              curriculums={curriculums}
              selectedCurriculums={selectedCurriculums}
              onCurriculumToggle={handleCurriculumToggle}
            />

            {(selectedCategories.length > 1 || selectedCurriculums.length > 1) && (
              <div className="flex items-center gap-2 pt-2">
                <span className="text-sm text-gray-400">Filter mode:</span>
                <div className="flex bg-black/50 rounded-lg p-1 border border-gray-700">
                  <Button
                    size="sm"
                    onClick={() => setFilterMode("AND")}
                    className={`text-xs ${
                      filterMode === "AND" ? "bg-red-600 text-white" : "text-gray-400 hover:text-white bg-transparent"
                    }`}
                  >
                    AND
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setFilterMode("OR")}
                    className={`text-xs ${
                      filterMode === "OR" ? "bg-red-600 text-white" : "text-gray-400 hover:text-white bg-transparent"
                    }`}
                  >
                    OR
                  </Button>
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Pagination and Video List */}
      <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-4 space-y-4">
        {/* Pagination Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">
              Showing {filteredVideos.length === 0 ? 0 : (validCurrentPage - 1) * itemsPerPage + 1}-
              {Math.min(validCurrentPage * itemsPerPage, filteredVideos.length)} of {filteredVideos.length} videos
            </span>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(validCurrentPage - 1)}
                disabled={validCurrentPage === 1}
                className="bg-black/50 border-gray-700 text-white hover:bg-gray-700"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-400">
                Page {validCurrentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(validCurrentPage + 1)}
                disabled={validCurrentPage === totalPages}
                className="bg-black/50 border-gray-700 text-white hover:bg-gray-700"
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Video List */}
        {filteredVideos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No videos found matching your criteria.</div>
        ) : (
          <div className="space-y-3">
            {paginatedVideos.map((video) => (
              <div
                key={video.id}
                className="flex gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
              >
                {/* Thumbnail */}
                <div className="flex-shrink-0">
                  <img
                    src={video.thumbnail_url || "/placeholder.svg"}
                    alt={video.title}
                    className="w-32 h-20 object-cover rounded"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 lg:justify-between">
                    {/* Video Details */}
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base font-semibold text-white flex-grow">{video.title}</h3>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>R: {video.recorded || "Unset"}</span>
                        <span>A: {formatDate(video.created_at)}</span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {video.curriculums
                          .toSorted((a, b) => a.display_order - b.display_order)
                          .map((curriculum) => (
                            <Badge
                              key={curriculum.id}
                              variant="outline"
                              className="text-xs"
                              style={{
                                borderColor: curriculum.color,
                                color: curriculum.color,
                              }}
                            >
                              {curriculum.name}
                            </Badge>
                          ))}
                        {video.categories.map((category) => (
                          <Badge
                            key={category.id}
                            className="text-xs"
                            style={{
                              backgroundColor: category.color + "40",
                              borderColor: category.color,
                              color: category.color,
                            }}
                          >
                            {category.name}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex flex-col items-end justify-between text-xs text-gray-400 flex-shrink-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditVideo(video)}
                          className="h-8 w-8 p-0 hover:bg-primary/10"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteVideo(video.id)}
                          className="h-8 w-8 p-0 !bg-red-600 text-white hover:!bg-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div>{video.views || 0} views</div>
                      <div>Last Viewed: {formatLastViewed(video.last_viewed_at)}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Video Modal */}
      <VideoModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        editingVideo={editingVideo}
        curriculums={curriculums}
        categories={categories}
        performers={performers}
      />
    </div>
  )
}
