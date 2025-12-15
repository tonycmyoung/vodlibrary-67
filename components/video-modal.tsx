"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
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
  recorded: string | null
  curriculums: Array<{ id: string; name: string; color: string; display_order: number }>
  categories: Array<{ id: string; name: string; color: string }>
  performers: Array<{ id: string; name: string }>
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

interface VideoModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  editingVideo: Video | null
  curriculums: Curriculum[]
  categories: Category[]
  performers: Performer[]
}

export default function VideoModal({
  isOpen,
  onClose,
  onSave,
  editingVideo,
  curriculums,
  categories,
  performers,
}: VideoModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    video_url: "",
    thumbnail_url: "",
    duration_seconds: "",
    is_published: true,
    recorded: "",
    curriculum_ids: [] as string[],
    category_ids: [] as string[],
    performer_ids: [] as string[],
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAutoFilling, setIsAutoFilling] = useState(false)
  const [thumbnailError, setThumbnailError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      if (editingVideo) {
        setFormData({
          title: editingVideo.title,
          description: editingVideo.description || "",
          video_url: editingVideo.video_url,
          thumbnail_url: editingVideo.thumbnail_url || "",
          duration_seconds: editingVideo.duration_seconds?.toString() || "",
          is_published: editingVideo.is_published,
          recorded: editingVideo.recorded === "Unset" ? "" : editingVideo.recorded || "",
          curriculum_ids: editingVideo.curriculums.map((c) => c.id),
          category_ids: editingVideo.categories.map((c) => c.id),
          performer_ids: editingVideo.performers.map((p) => p.id),
        })
      } else {
        setFormData({
          title: "",
          description: "",
          video_url: "",
          thumbnail_url: "",
          duration_seconds: "",
          is_published: true,
          recorded: "",
          curriculum_ids: [],
          category_ids: [],
          performer_ids: [],
        })
      }
      setThumbnailError(null)
    }
  }, [isOpen, editingVideo])

  const handleAutoFill = async () => {
    if (!formData.video_url) {
      alert("Please enter a video URL first")
      return
    }

    setIsAutoFilling(true)
    setThumbnailError(null)
    try {
      const metadata = await extractVideoMetadata(formData.video_url)
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
        curriculumIds: formData.curriculum_ids,
        categoryIds: formData.category_ids,
        performerIds: formData.performer_ids,
        durationSeconds: formData.duration_seconds ? Number.parseInt(formData.duration_seconds) : null,
        isPublished: formData.is_published,
        recorded: formData.recorded || null,
        videoId: editingVideo?.id || null,
      }

      const result = await saveVideo(videoData)

      if (result.error) {
        console.error("Error saving video:", result.error)
        alert(`Error: ${result.error}`)
        return
      }

      onSave()
    } catch (error) {
      console.error("Error saving video:", error)
      alert("An unexpected error occurred while saving the video")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">
            {editingVideo ? `Edit Video: ${editingVideo.title}` : "Add New Video"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="video-title" className="block text-sm font-medium text-gray-300 mb-2">
              Title *
            </label>
            <Input
              id="video-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-gray-900/50 border-gray-700 text-white"
              required
            />
          </div>

          <div>
            <label htmlFor="video-description" className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              id="video-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full min-h-[80px] rounded-md border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-y"
              rows={3}
              placeholder="Enter video description..."
            />
          </div>

          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-6">
              <label htmlFor="video-url" className="block text-sm font-medium text-gray-300 mb-2">
                Video URL *
              </label>
              <Input
                id="video-url"
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                className="bg-gray-900/50 border-gray-700 text-white"
                required
              />
            </div>
            <div className="col-span-1">
              <Button
                type="button"
                onClick={handleAutoFill}
                disabled={isAutoFilling}
                className="bg-blue-600 hover:bg-blue-700 w-10 h-10 p-0"
                title="Auto-fill metadata"
              >
                {isAutoFilling ? <Loader2 className="w-4 h-4 animate-spin" /> : "⚡"}
              </Button>
            </div>
            <div className="col-span-5">
              <label htmlFor="video-thumbnail" className="block text-sm font-medium text-gray-300 mb-2">
                Thumbnail URL
              </label>
              <Input
                id="video-thumbnail"
                value={formData.thumbnail_url}
                onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                className="bg-gray-900/50 border-gray-700 text-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="video-recorded" className="block text-sm font-medium text-gray-300 mb-2">
              Recorded
            </label>
            <Input
              id="video-recorded"
              value={formData.recorded}
              onChange={(e) => setFormData({ ...formData, recorded: e.target.value })}
              className="bg-gray-900/50 border-gray-700 text-white"
              placeholder="e.g., 2024-01-15, January 2024, etc."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Curriculum</label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-700 rounded p-3 bg-gray-900/30">
                {curriculums
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((curriculum) => (
                    <label key={curriculum.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.curriculum_ids.includes(curriculum.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              curriculum_ids: [...formData.curriculum_ids, curriculum.id],
                            })
                          } else {
                            setFormData({
                              ...formData,
                              curriculum_ids: formData.curriculum_ids.filter((id) => id !== curriculum.id),
                            })
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm font-medium" style={{ color: curriculum.color || "#9ca3af" }}>
                        {curriculum.name}
                      </span>
                    </label>
                  ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Categories</label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-700 rounded p-3 bg-gray-900/30">
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
                      className="rounded"
                    />
                    <span className="text-sm font-medium" style={{ color: category.color || "#9ca3af" }}>
                      {category.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Performers</label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-700 rounded p-3 bg-gray-900/30">
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
                      className="rounded"
                    />
                    <span className="text-gray-300 text-sm">{performer.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="rounded"
              />
              <span className="text-gray-300">Published</span>
            </label>
          </div>

          {thumbnailError && <div className="text-red-400 text-sm">{thumbnailError}</div>}

          <div className="flex space-x-4 pt-4">
            <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingVideo ? "Update Video" : "Add Video"}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
