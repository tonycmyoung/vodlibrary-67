"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import VideoCard from "@/components/video-card"
import VideoCardList from "@/components/video-card-list"
import ViewToggle from "@/components/view-toggle"
import CategoryFilter from "@/components/category-filter"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Loader2 } from "lucide-react"

interface Video {
  id: string
  title: string
  description: string | null
  video_url: string
  thumbnail_url: string | null
  duration_seconds: number | null
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

export default function VideoLibrary() {
  const [videos, setVideos] = useState<Video[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [filterMode, setFilterMode] = useState<"AND" | "OR">("AND")
  const [view, setView] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("videoLibraryView") as "grid" | "list") || "grid"
    }
    return "grid"
  })

  useEffect(() => {
    fetchCategories()
    fetchVideos()
  }, [])

  useEffect(() => {
    fetchVideos()
  }, [selectedCategories, searchQuery, filterMode])

  const fetchCategories = async () => {
    const { data, error } = await supabase.from("categories").select("*").order("name")

    if (error) {
      console.error("Error fetching categories:", error)
      return
    }

    setCategories(data || [])
  }

  const fetchVideos = async () => {
    setLoading(true)

    let query = supabase
      .from("videos")
      .select(
        `
        *,
        video_categories!inner(
          categories(id, name, color)
        )
      `,
      )
      .eq("is_published", true)

    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
    }

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching videos:", error)
      setLoading(false)
      return
    }

    const videosWithCategories = data?.reduce((acc: Video[], video: any) => {
      const existingVideo = acc.find((v) => v.id === video.id)

      const videoCategories = video.video_categories || []

      if (existingVideo) {
        videoCategories.forEach((videoCategory: any) => {
          const category = videoCategory.categories

          if (category && category.id && category.name) {
            const categoryExists = existingVideo.categories.some((cat) => cat.id === category.id)
            if (!categoryExists) {
              existingVideo.categories.push(category)
            }
          }
        })
      } else {
        const categories: Array<{ id: string; name: string; color: string }> = []

        videoCategories.forEach((videoCategory: any) => {
          const category = videoCategory.categories

          if (category && category.id && category.name) {
            const categoryExists = categories.some((cat) => cat.id === category.id)
            if (!categoryExists) {
              categories.push(category)
            }
          }
        })

        acc.push({
          ...video,
          categories,
        })
      }

      return acc
    }, [])

    let filteredVideos = videosWithCategories || []
    if (selectedCategories.length > 0) {
      filteredVideos = filteredVideos.filter((video) => {
        const videoCategories = video.categories.map((cat) => cat.id)

        let matches = false
        if (filterMode === "AND") {
          matches = selectedCategories.every((selectedId) => videoCategories.includes(selectedId))
        } else {
          matches = selectedCategories.some((selectedId) => videoCategories.includes(selectedId))
        }

        return matches
      })
    }

    setVideos(filteredVideos)
    setLoading(false)
  }

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  const handleViewChange = (newView: "grid" | "list") => {
    setView(newView)
    localStorage.setItem("videoLibraryView", newView)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Search and Filters */}
      <div className="mb-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-black/50 border-gray-700 text-white placeholder:text-gray-400 focus:border-red-500"
            />
          </div>
          <ViewToggle view={view} onViewChange={handleViewChange} />
        </div>

        <CategoryFilter
          categories={categories}
          selectedCategories={selectedCategories}
          onCategoryToggle={handleCategoryToggle}
        />

        {selectedCategories.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Filter mode:</span>
            <div className="flex bg-black/50 rounded-lg p-1 border border-gray-700">
              <Button
                variant={filterMode === "AND" ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterMode("AND")}
                className={`text-xs px-3 py-1 ${
                  filterMode === "AND"
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                AND
              </Button>
              <Button
                variant={filterMode === "OR" ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterMode("OR")}
                className={`text-xs px-3 py-1 ${
                  filterMode === "OR"
                    ? "bg-red-600 text-white hover:bg-red-700"
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
      </div>

      {/* Video Display */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          <span className="ml-2 text-gray-300">Loading videos...</span>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">No videos found matching your criteria.</p>
        </div>
      ) : (
        <>
          {view === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {videos.map((video) => (
                <VideoCardList key={video.id} video={video} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
