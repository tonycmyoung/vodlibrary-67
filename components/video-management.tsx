"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Trash2, Clock, Loader2, Wand2, Pencil } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { extractVideoMetadata, formatDuration as formatVideoDuration } from "@/lib/video-utils"

interface Video {
  id: string
  title: string
  description: string | null
  video_url: string
  thumbnail_url: string | null
  duration_seconds: number | null
  is_published: boolean
  created_at: string
  categories: Array<{
    id: string
    name: string
    color: string
  }>
}

interface Category {
  id: string
  name: string
  color: string
}

export default function VideoManagement() {
  const [videos, setVideos] = useState<Video[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    video_url: "",
    thumbnail_url: "",
    duration_seconds: "",
    is_published: true,
    category_ids: [] as string[],
  })

  // State for auto-fill loading
  const [isAutoFilling, setIsAutoFilling] = useState(false)

  useEffect(() => {
    fetchVideos()
    fetchCategories()
  }, [])

  useEffect(() => {
    filterVideos()
  }, [videos, searchQuery])

  const fetchCategories = async () => {
    const { data, error } = await supabase.from("categories").select("*").order("name")

    if (error) {
      console.error("Error fetching categories:", error)
      return
    }

    setCategories(data || [])
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
          )
        `,
        )
        .order("created_at", { ascending: false })

      if (error) throw error

      const videosWithCategories = data?.map((video: any) => ({
        ...video,
        categories: video.video_categories?.map((vc: any) => vc.categories).filter((cat: any) => cat && cat.id) || [],
      }))

      setVideos(videosWithCategories || [])
    } catch (error) {
      console.error("Error fetching videos:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterVideos = () => {
    if (!searchQuery) {
      setFilteredVideos(videos)
      return
    }

    const filtered = videos.filter(
      (video) =>
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.description?.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    setFilteredVideos(filtered)
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      video_url: "",
      thumbnail_url: "",
      duration_seconds: "",
      is_published: true,
      category_ids: [],
    })
    setEditingVideo(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const videoData = {
        title: formData.title,
        description: formData.description || null,
        video_url: formData.video_url,
        thumbnail_url: formData.thumbnail_url || null,
        duration_seconds: formData.duration_seconds ? Number.parseInt(formData.duration_seconds) : null,
        is_published: formData.is_published,
      }

      let videoId: string

      if (editingVideo) {
        // Update existing video
        const { error } = await supabase.from("videos").update(videoData).eq("id", editingVideo.id)

        if (error) throw error
        videoId = editingVideo.id
      } else {
        // Create new video
        const { data, error } = await supabase.from("videos").insert(videoData).select().single()

        if (error) throw error
        videoId = data.id
      }

      // Update video categories
      if (formData.category_ids.length > 0) {
        // Delete existing categories
        await supabase.from("video_categories").delete().eq("video_id", videoId)

        // Insert new categories
        const categoryInserts = formData.category_ids.map((categoryId) => ({
          video_id: videoId,
          category_id: categoryId,
        }))

        const { error: categoryError } = await supabase.from("video_categories").insert(categoryInserts)

        if (categoryError) throw categoryError
      }

      // Refresh videos
      await fetchVideos()

      // Close dialog and reset form
      setIsAddDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error saving video:", error)
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
      category_ids: video.categories.map((c) => c.id),
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
    try {
      const metadata = await extractVideoMetadata(formData.video_url)

      const isGoogleDrive = formData.video_url.includes("drive.google.com")

      setFormData((prev) => ({
        ...prev,
        thumbnail_url: metadata.thumbnail || prev.thumbnail_url,
        duration_seconds: metadata.duration ? Math.round(metadata.duration).toString() : prev.duration_seconds,
      }))

      // Show helpful message for Google Drive videos
      if (isGoogleDrive && !metadata.duration) {
        alert(
          "Thumbnail extracted successfully! Duration cannot be auto-detected for Google Drive videos - please enter it manually in seconds.",
        )
      }
    } catch (error) {
      console.error("Error extracting video metadata:", error)
      alert("Could not extract video metadata. Please fill in manually.")
    } finally {
      setIsAutoFilling(false)
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

  return (
    <div className="space-y-6">
      {/* Header with search and add button */}
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
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                        <Input
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="bg-gray-800 border-gray-600 text-white"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="bg-gray-800 border-gray-600 text-white"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Video URL</label>
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
                        <label className="block text-sm font-medium text-gray-300 mb-2">
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
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Duration (seconds)
                          {formData.duration_seconds && (
                            <span className="text-xs text-gray-400 ml-2">
                              ({formatVideoDuration(Number.parseInt(formData.duration_seconds))})
                            </span>
                          )}
                        </label>
                        <Input
                          type="number"
                          value={formData.duration_seconds}
                          onChange={(e) => setFormData({ ...formData, duration_seconds: e.target.value })}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="300 or auto-detected"
                        />
                        {formData.video_url.includes("drive.google.com") && (
                          <p className="text-xs text-yellow-400 mt-1">
                            ⚠️ Google Drive videos require manual duration entry (cannot be auto-detected)
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
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
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Categories</label>
                        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-3 bg-gray-800 border border-gray-600 rounded-md">
                          {categories.map((category) => (
                            <label key={category.id} className="flex items-center space-x-2 cursor-pointer">
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
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAddDialogOpen(false)}
                        className="border-gray-600 text-gray-300 hover:bg-gray-800"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
                        {editingVideo ? "Update Video" : "Add Video"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Videos list */}
      <Card className="bg-black/60 border-gray-800">
        <CardContent className="p-6">
          <div className="space-y-4">
            {filteredVideos.map((video) => (
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
                          // Fallback to video icon if thumbnail fails to load
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
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDuration(video.duration_seconds)}</span>
                      </div>
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
