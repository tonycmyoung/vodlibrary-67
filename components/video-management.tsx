"use client"

import type React from "react"
import SortControl from "@/components/sort-control"

import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Plus, Search, Trash2, Clock, Loader2, Wand2, Pencil } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { extractVideoMetadata } from "@/lib/video-utils"
import { saveVideo } from "@/lib/actions"

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
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [videos, setVideos] = useState<Video[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [performers, setPerformers] = useState<Performer[]>([])
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([])
  const [paginatedVideos, setPaginatedVideos] = useState<Video[]>([])
  const [currentPage, setCurrentPage] = useState(() => {
    const pageParam = searchParams.get("page")
    return pageParam ? Math.max(1, Number.parseInt(pageParam)) : 1
  })
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    if (typeof window !== "undefined") {
      return Number.parseInt(localStorage.getItem("videoManagementItemsPerPage") || "10")
    }
    return 10
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [sortBy, setSortBy] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("videoManagementSortBy") || "category"
    }
    return "category"
  })
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("videoManagementSortOrder") as "asc" | "desc") || "asc"
    }
    return "asc"
  })

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

  const [isAutoFilling, setIsAutoFilling] = useState(false)
  const [thumbnailError, setThumbnailError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isInitialMount = useRef(true)

  useEffect(() => {
    fetchVideos()
    fetchCategories()
    fetchPerformers()
  }, [])

  useEffect(() => {
    filterVideos()
  }, [videos, searchQuery]) // Removed sort dependencies

  useEffect(() => {
    updatePaginatedVideos()
  }, [filteredVideos, currentPage, itemsPerPage])

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

      switch (sortBy) {
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
      if (sortOrder === "asc") {
        result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        result = aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }

      if (result === 0 && sortBy !== "title") {
        const aTitle = a.title.toLowerCase()
        const bTitle = b.title.toLowerCase()
        result = aTitle < bTitle ? -1 : aTitle > bTitle ? 1 : 0
      }

      return result
    })

    setFilteredVideos(filtered)

    if (!isInitialMount.current) {
      setCurrentPage(1)
    } else {
      isInitialMount.current = false
    }
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
    setEditingVideo(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      const videoData = {
        title: formData.title,
        description: formData.description || "",
        videoUrl: formData.video_url,
        thumbnailUrl: formData.thumbnail_url || "",
        performerId: formData.performer_ids[0] || "", // Use first performer for now
        categoryIds: formData.category_ids,
        performerIds: formData.performer_ids,
        durationSeconds: formData.duration_seconds ? Number.parseInt(formData.duration_seconds) : null,
        isPublished: formData.is_published,
        recorded: formData.recorded || null,
      }

      if (editingVideo) {
        const { error } = await supabase
          .from("videos")
          .update({
            title: formData.title,
            description: formData.description || null,
            video_url: formData.video_url,
            thumbnail_url: formData.thumbnail_url || null,
            duration_seconds: formData.duration_seconds ? Number.parseInt(formData.duration_seconds) : null,
            is_published: formData.is_published,
            recorded: formData.recorded || null,
          })
          .eq("id", editingVideo.id)

        if (error) {
          console.error("Error updating video:", error)
          alert(`Error: ${error.message}`)
          return
        }

        await supabase.from("video_categories").delete().eq("video_id", editingVideo.id)
        if (formData.category_ids.length > 0) {
          const categoryInserts = formData.category_ids.map((categoryId) => ({
            video_id: editingVideo.id,
            category_id: categoryId,
          }))
          await supabase.from("video_categories").insert(categoryInserts)
        }

        await supabase.from("video_performers").delete().eq("video_id", editingVideo.id)
        if (formData.performer_ids.length > 0) {
          const performerInserts = formData.performer_ids.map((performerId) => ({
            video_id: editingVideo.id,
            performer_id: performerId,
          }))
          await supabase.from("video_performers").insert(performerInserts)
        }
      } else {
        const result = await saveVideo(videoData)

        if (result.error) {
          console.error("Error saving video:", result.error)
          alert(`Error: ${result.error}`)
          return
        }
      }

      await fetchVideos()

      setIsAddDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error saving video:", error)
      alert("An unexpected error occurred while saving the video")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (video: Video) => {
    setEditingVideo(video)
    setFormData({
      title: video.title,
      description: video.description || "",
      video_url: video.video_url,
      thumbnail_url: video.thumbnail_url || "",
      duration_seconds: video.duration_seconds?.toString() || "",
      is_published: video.is_published,
      recorded: video.recorded === "Unset" ? "" : video.recorded || "",
      category_ids: video.categories.map((c) => c.id),
      performer_ids: video.performers.map((p) => p.id),
    })
    setIsAddDialogOpen(true)
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

      setFormData((prev) => ({
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

  const handleSortChange = (newSortBy: string, newSortOrder: "asc" | "desc") => {
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)

    localStorage.setItem("videoManagementSortBy", newSortBy)
    localStorage.setItem("videoManagementSortOrder", newSortOrder)

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

      switch (newSortBy) {
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
      if (newSortOrder === "asc") {
        result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        result = aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }

      if (result === 0 && newSortBy !== "title") {
        const aTitle = a.title.toLowerCase()
        const bTitle = b.title.toLowerCase()
        result = aTitle < bTitle ? -1 : aTitle > bTitle ? 1 : 0
      }

      return result
    })

    setFilteredVideos(filtered)
  }

  const updatePaginatedVideos = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginated = filteredVideos.slice(startIndex, endIndex)
    setPaginatedVideos(paginated)

    console.log(
      `[v0] Pagination update: page ${currentPage}, showing ${paginated.length} of ${filteredVideos.length} videos`,
    )
  }

  const totalPages = Math.ceil(filteredVideos.length / itemsPerPage)
  const startItem = filteredVideos.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, filteredVideos.length)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    const params = new URLSearchParams(searchParams.toString())
    if (page === 1) {
      params.delete("page")
    } else {
      params.set("page", page.toString())
    }
    const currentPath = window.location.pathname
    const newUrl = params.toString() ? `${currentPath}?${params.toString()}` : currentPath
    router.replace(newUrl)

    document.querySelector(".space-y-6")?.scrollIntoView({ behavior: "smooth" })
  }

  const handleItemsPerPageChange = (newItemsPerPage: string) => {
    const itemsPerPageNum = Number.parseInt(newItemsPerPage)
    setItemsPerPage(itemsPerPageNum)
    setCurrentPage(1)
    localStorage.setItem("videoManagementItemsPerPage", newItemsPerPage)
  }

  const PaginationControls = () => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
      <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-20 bg-gray-800 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem
                value="5"
                className="text-white hover:bg-gray-600 focus:bg-gray-600 hover:text-white focus:text-white"
              >
                5
              </SelectItem>
              <SelectItem
                value="10"
                className="text-white hover:bg-gray-600 focus:bg-gray-600 hover:text-white focus:text-white"
              >
                10
              </SelectItem>
              <SelectItem
                value="20"
                className="text-white hover:bg-gray-600 focus:bg-gray-600 hover:text-white focus:text-white"
              >
                20
              </SelectItem>
              <SelectItem
                value="50"
                className="text-white hover:bg-gray-600 focus:bg-gray-600 hover:text-white focus:text-white"
              >
                50
              </SelectItem>
              <SelectItem
                value="100"
                className="text-white hover:bg-gray-600 focus:bg-gray-600 hover:text-white focus:text-white"
              >
                100
              </SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-white">per page</span>
        </div>
        <div className="text-sm text-white whitespace-nowrap">
          Showing {startItem}-{endItem} of {filteredVideos.length} videos
        </div>
      </div>
      <div className="ml-auto">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                className={`text-white hover:bg-gray-700 ${currentPage === 1 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              />
            </PaginationItem>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }

              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    onClick={() => handlePageChange(pageNum)}
                    isActive={currentPage === pageNum}
                    className={`cursor-pointer text-white hover:bg-gray-700 ${
                      currentPage === pageNum ? "bg-red-600 text-white hover:bg-red-700" : ""
                    }`}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              )
            })}

            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <PaginationItem>
                  <PaginationEllipsis className="text-white" />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink
                    onClick={() => handlePageChange(totalPages)}
                    className="cursor-pointer text-white hover:bg-gray-700"
                  >
                    {totalPages}
                  </PaginationLink>
                </PaginationItem>
              </>
            )}

            <PaginationItem>
              <PaginationNext
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                className={`text-white hover:bg-gray-700 ${currentPage === totalPages ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )

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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-400 focus:border-purple-500"
                />
              </div>
              <SortControl sortBy={sortBy} sortOrder={sortOrder} onSortChange={handleSortChange} />
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm} className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Video
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingVideo ? "Edit Video" : "Add New Video"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-3 leading-5">
                    <div className="grid grid-cols-2 gap-3 leading-5">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-0">Title</label>
                        <Input
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="bg-gray-800 border-gray-600 text-white"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="bg-gray-800 border-gray-600 text-white"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Video URL</label>
                        <div className="flex space-x-2">
                          <Input
                            value={formData.video_url}
                            onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                            className="bg-gray-800 border-gray-600 text-white flex-1"
                            placeholder="https://drive.google.com/..."
                            required
                          />
                          <Button
                            type="button"
                            onClick={handleAutoFill}
                            disabled={!formData.video_url || isAutoFilling}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3"
                            title="Auto-fill thumbnail and duration"
                          >
                            {isAutoFilling ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Wand2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Thumbnail URL
                          {formData.thumbnail_url && formData.thumbnail_url.startsWith("data:") && (
                            <span className="text-xs text-blue-400 ml-2">(Auto-generated)</span>
                          )}
                        </label>
                        <Input
                          value={formData.thumbnail_url}
                          onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="https://... or auto-generated"
                        />
                        {thumbnailError && <p className="text-sm text-red-400 mt-1">{thumbnailError}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                        <Select
                          value={formData.is_published.toString()}
                          onValueChange={(value) => setFormData({ ...formData, is_published: value === "true" })}
                        >
                          <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-600">
                            <SelectItem value="true">Published</SelectItem>
                            <SelectItem value="false">Draft</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Recorded</label>
                        <Input
                          value={formData.recorded}
                          onChange={(e) => setFormData({ ...formData, recorded: e.target.value })}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="e.g., 2023 (leave blank for 'Unset')"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Categories</label>
                        <div className="grid grid-cols-3 max-h-28 overflow-y-auto p-2 bg-gray-800 border border-gray-600 rounded-md leading-5 py-px gap-0">
                          {categories.map((category) => (
                            <label key={category.id} className="flex items-center space-x-2 cursor-pointer leading-7">
                              <input
                                type="checkbox"
                                checked={formData.category_ids.includes(category.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      category_ids: [...formData.category_ids, category.id],
                                    })
                                  } else {
                                    setFormData({
                                      ...formData,
                                      category_ids: formData.category_ids.filter((id) => id !== category.id),
                                    })
                                  }
                                }}
                                className="rounded border-gray-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-800"
                              />
                              <Badge
                                variant="outline"
                                className="text-xs"
                                style={{
                                  borderColor: category.color + "60",
                                  color: category.color,
                                }}
                              >
                                {category.name}
                              </Badge>
                            </label>
                          ))}
                          {categories.length === 0 && (
                            <p className="text-gray-400 text-sm col-span-2">
                              No categories available. Create categories first.
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Performers</label>
                        <div className="grid grid-cols-3 max-h-28 overflow-y-auto p-2 bg-gray-800 border border-gray-600 rounded-md py-px w-auto gap-0">
                          {performers.map((performer) => (
                            <label key={performer.id} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.performer_ids.includes(performer.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      performer_ids: [...formData.performer_ids, performer.id],
                                    })
                                  } else {
                                    setFormData({
                                      ...formData,
                                      performer_ids: formData.performer_ids.filter((id) => id !== performer.id),
                                    })
                                  }
                                }}
                                className="rounded border-gray-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-800"
                              />
                              <Badge variant="outline" className="text-xs border-purple-600 text-purple-400">
                                {performer.name}
                              </Badge>
                            </label>
                          ))}
                          {performers.length === 0 && (
                            <p className="text-gray-400 text-sm col-span-2">
                              No performers available. Create performers first.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-0.5">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAddDialogOpen(false)}
                        className="border-gray-600 text-gray-300 hover:bg-gray-800"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            {editingVideo ? "Updating..." : "Adding..."}
                          </>
                        ) : editingVideo ? (
                          "Update Video"
                        ) : (
                          "Add Video"
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {filteredVideos.length > 0 && <PaginationControls />}

      <Card className="bg-black/60 border-gray-800">
        <CardContent className="p-6">
          <div className="space-y-4">
            {paginatedVideos.map((video) => (
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
                      <p className="text-sm text-gray-300 mb-2 line-clamp-2 max-w-md w-auto">{video.description}</p>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      {video.recorded && video.recorded !== "Unset" && <span>Recorded: {video.recorded}</span>}
                      {video.performers.length > 0 && (
                        <span>Performers: {video.performers.map((p) => p.name).join(", ")}</span>
                      )}
                      <span>Added {formatDate(video.created_at)}</span>
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

      {filteredVideos.length > 0 && <PaginationControls />}
    </div>
  )
}
