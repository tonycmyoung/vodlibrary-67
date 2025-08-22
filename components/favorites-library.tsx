"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import VideoCard from "@/components/video-card"
import VideoCardList from "@/components/video-card-list"
import ViewToggle from "@/components/view-toggle"
import CategoryFilter from "@/components/category-filter"
import SortControl from "@/components/sort-control"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Heart, Loader2, Search } from "lucide-react"

interface Video {
  id: string
  title: string
  description: string | null
  video_url: string
  thumbnail_url: string | null
  duration_seconds: number | null
  created_at: string
  recorded: string | null
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

export default function FavoritesLibrary() {
  const [favoriteVideos, setFavoriteVideos] = useState<Video[]>([])
  const [allFavoriteVideos, setAllFavoriteVideos] = useState<Video[]>([]) // Store unfiltered favorites for search/filter
  const [categories, setCategories] = useState<Category[]>([])
  const [performers, setPerformers] = useState<Performer[]>([])
  const [recordedValues, setRecordedValues] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMode, setFilterMode] = useState<"AND" | "OR">("AND")
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("favoritesLibrarySortBy") || "title"
    }
    return "title"
  })
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("favoritesLibrarySortOrder") as "asc" | "desc") || "asc"
    }
    return "asc"
  })
  const [view, setView] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("favoritesLibraryView") as "grid" | "list") || "grid"
    }
    return "grid"
  })

  useEffect(() => {
    fetchCategories()
    fetchPerformers()
    fetchFavoriteVideos()
  }, [])

  useEffect(() => {
    filterVideos()
  }, [selectedCategories, searchQuery, filterMode, allFavoriteVideos, sortBy, sortOrder])

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

  const filterVideos = () => {
    let filteredVideos = [...allFavoriteVideos]

    const uniqueRecorded = [...new Set(filteredVideos.map((v) => v.recorded).filter((r) => r && r !== "Unset"))]
    setRecordedValues(uniqueRecorded)

    // Apply search filter
    if (searchQuery) {
      filteredVideos = filteredVideos.filter(
        (video) =>
          video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (video.description && video.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          video.performers.some((performer) => performer.name.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    }

    // Apply category filter
    if (selectedCategories.length > 0) {
      filteredVideos = filteredVideos.filter((video) => {
        const videoCategories = video.categories.map((cat) => cat.id)
        const videoPerformers = video.performers.map((perf) => perf.id)

        const selectedCategoryIds = selectedCategories.filter(
          (id) => !id.startsWith("recorded:") && !id.startsWith("performer:"),
        )
        const selectedRecordedValues = selectedCategories
          .filter((id) => id.startsWith("recorded:"))
          .map((id) => id.replace("recorded:", ""))
        const selectedPerformerIds = selectedCategories
          .filter((id) => id.startsWith("performer:"))
          .map((id) => id.replace("performer:", ""))

        let categoryMatches = selectedCategoryIds.length === 0 ? true : false
        let recordedMatches = selectedRecordedValues.length === 0 ? true : false
        let performerMatches = selectedPerformerIds.length === 0 ? true : false

        if (selectedCategoryIds.length > 0) {
          if (filterMode === "AND") {
            categoryMatches = selectedCategoryIds.every((selectedId) => videoCategories.includes(selectedId))
          } else {
            categoryMatches = selectedCategoryIds.some((selectedId) => videoCategories.includes(selectedId))
          }
        }

        if (selectedRecordedValues.length > 0) {
          recordedMatches = selectedRecordedValues.includes(video.recorded || "")
        }

        if (selectedPerformerIds.length > 0) {
          if (filterMode === "AND") {
            performerMatches = selectedPerformerIds.every((selectedId) => videoPerformers.includes(selectedId))
          } else {
            performerMatches = selectedPerformerIds.some((selectedId) => videoPerformers.includes(selectedId))
          }
        }

        // Apply filter mode logic across all filter types
        const activeFilters = [
          selectedCategoryIds.length > 0 ? categoryMatches : null,
          selectedRecordedValues.length > 0 ? recordedMatches : null,
          selectedPerformerIds.length > 0 ? performerMatches : null,
        ].filter((match) => match !== null)

        if (activeFilters.length === 0) return true

        if (filterMode === "AND") {
          return activeFilters.every((match) => match === true)
        } else {
          return activeFilters.some((match) => match === true)
        }
      })
    }

    filteredVideos.sort((a, b) => {
      let aValue: any, bValue: any

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
          aValue = !a.recorded || a.recorded === "Unset" ? "" : a.recorded.toLowerCase()
          bValue = !b.recorded || b.recorded === "Unset" ? "" : b.recorded.toLowerCase()
          break
        case "performers":
          aValue =
            a.performers.length > 0
              ? a.performers
                  .map((p) => p.name)
                  .join(", ")
                  .toLowerCase()
              : ""
          bValue =
            b.performers.length > 0
              ? b.performers
                  .map((p) => p.name)
                  .join(", ")
                  .toLowerCase()
              : ""
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

      // If primary sort values are equal and not sorting by title, use title as secondary sort
      if (result === 0 && sortBy !== "title") {
        const aTitle = a.title.toLowerCase()
        const bTitle = b.title.toLowerCase()
        result = aTitle < bTitle ? -1 : aTitle > bTitle ? 1 : 0
      }

      return result
    })

    setFavoriteVideos(filteredVideos)
  }

  const fetchFavoriteVideos = async () => {
    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from("user_favorites")
        .select(
          `
          videos!inner(
            *,
            video_categories!inner(
              categories(id, name, color)
            ),
            video_performers(
              performers(id, name)
            )
          )
        `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching favorite videos:", error)
        return
      }

      const videosWithCategoriesAndPerformers = data?.reduce((acc: Video[], favorite: any) => {
        const video = favorite.videos
        const existingVideo = acc.find((v) => v.id === video.id)

        const videoCategories = video.video_categories || []
        const videoPerformers = video.video_performers || []

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

          videoPerformers.forEach((videoPerformer: any) => {
            const performer = videoPerformer.performers

            if (performer && performer.id && performer.name) {
              const performerExists = existingVideo.performers.some((perf) => perf.id === performer.id)
              if (!performerExists) {
                existingVideo.performers.push(performer)
              }
            }
          })
        } else {
          const categories: Array<{ id: string; name: string; color: string }> = []
          const performers: Array<{ id: string; name: string }> = []

          videoCategories.forEach((videoCategory: any) => {
            const category = videoCategory.categories

            if (category && category.id && category.name) {
              const categoryExists = categories.some((cat) => cat.id === category.id)
              if (!categoryExists) {
                categories.push(category)
              }
            }
          })

          videoPerformers.forEach((videoPerformer: any) => {
            const performer = videoPerformer.performers

            if (performer && performer.id && performer.name) {
              const performerExists = performers.some((perf) => perf.id === performer.id)
              if (!performerExists) {
                performers.push(performer)
              }
            }
          })

          acc.push({
            ...video,
            categories,
            performers,
          })
        }

        return acc
      }, [])

      setAllFavoriteVideos(videosWithCategoriesAndPerformers || [])
      setFavoriteVideos(videosWithCategoriesAndPerformers || [])
    } catch (error) {
      console.error("Error fetching favorite videos:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  const handleViewChange = (newView: "grid" | "list") => {
    setView(newView)
    localStorage.setItem("favoritesLibraryView", newView)
  }

  const handleSortChange = (newSortBy: string, newSortOrder: "asc" | "desc") => {
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)

    localStorage.setItem("favoritesLibrarySortBy", newSortBy)
    localStorage.setItem("favoritesLibrarySortOrder", newSortOrder)

    let filteredVideos = [...allFavoriteVideos]

    // Apply search filter
    if (searchQuery) {
      filteredVideos = filteredVideos.filter(
        (video) =>
          video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (video.description && video.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          video.performers.some((performer) => performer.name.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    }

    // Apply category filter
    if (selectedCategories.length > 0) {
      filteredVideos = filteredVideos.filter((video) => {
        const videoCategories = video.categories.map((cat) => cat.id)
        const videoPerformers = video.performers.map((perf) => perf.id)

        const selectedCategoryIds = selectedCategories.filter(
          (id) => !id.startsWith("recorded:") && !id.startsWith("performer:"),
        )
        const selectedRecordedValues = selectedCategories
          .filter((id) => id.startsWith("recorded:"))
          .map((id) => id.replace("recorded:", ""))
        const selectedPerformerIds = selectedCategories
          .filter((id) => id.startsWith("performer:"))
          .map((id) => id.replace("performer:", ""))

        let categoryMatches = selectedCategoryIds.length === 0 ? true : false
        let recordedMatches = selectedRecordedValues.length === 0 ? true : false
        let performerMatches = selectedPerformerIds.length === 0 ? true : false

        if (selectedCategoryIds.length > 0) {
          if (filterMode === "AND") {
            categoryMatches = selectedCategoryIds.every((selectedId) => videoCategories.includes(selectedId))
          } else {
            categoryMatches = selectedCategoryIds.some((selectedId) => videoCategories.includes(selectedId))
          }
        }

        if (selectedRecordedValues.length > 0) {
          recordedMatches = selectedRecordedValues.includes(video.recorded || "")
        }

        if (selectedPerformerIds.length > 0) {
          if (filterMode === "AND") {
            performerMatches = selectedPerformerIds.every((selectedId) => videoPerformers.includes(selectedId))
          } else {
            performerMatches = selectedPerformerIds.some((selectedId) => videoPerformers.includes(selectedId))
          }
        }

        // Apply filter mode logic across all filter types
        const activeFilters = [
          selectedCategoryIds.length > 0 ? categoryMatches : null,
          selectedRecordedValues.length > 0 ? recordedMatches : null,
          selectedPerformerIds.length > 0 ? performerMatches : null,
        ].filter((match) => match !== null)

        if (activeFilters.length === 0) return true

        if (filterMode === "AND") {
          return activeFilters.every((match) => match === true)
        } else {
          return activeFilters.some((match) => match === true)
        }
      })
    }

    // Apply sorting with new parameters
    filteredVideos.sort((a, b) => {
      let aValue: any, bValue: any

      switch (newSortBy) {
        case "title":
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case "created_at":
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        case "recorded":
          aValue = !a.recorded || a.recorded === "Unset" ? "" : a.recorded.toLowerCase()
          bValue = !b.recorded || b.recorded === "Unset" ? "" : b.recorded.toLowerCase()
          break
        case "performers":
          aValue =
            a.performers.length > 0
              ? a.performers
                  .map((p) => p.name)
                  .join(", ")
                  .toLowerCase()
              : ""
          bValue =
            b.performers.length > 0
              ? b.performers
                  .map((p) => p.name)
                  .join(", ")
                  .toLowerCase()
              : ""
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

      // If primary sort values are equal and not sorting by title, use title as secondary sort
      if (result === 0 && newSortBy !== "title") {
        const aTitle = a.title.toLowerCase()
        const bTitle = b.title.toLowerCase()
        result = aTitle < bTitle ? -1 : aTitle > bTitle ? 1 : 0
      }

      return result
    })

    setFavoriteVideos(filteredVideos)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        <span className="ml-2 text-gray-300">Loading your favorites...</span>
      </div>
    )
  }

  if (allFavoriteVideos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No favorites yet</h3>
        <p className="text-gray-400 mb-6">Start adding videos to your favorites to see them here.</p>
        <a
          href="/"
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Browse Videos
        </a>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search favorites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-black/50 border-gray-700 text-white placeholder:text-gray-400 focus:border-red-500"
            />
          </div>
          <div className="flex items-center gap-4">
            <SortControl sortBy={sortBy} sortOrder={sortOrder} onSortChange={handleSortChange} />
            <ViewToggle view={view} onViewChange={handleViewChange} />
          </div>
        </div>

        <CategoryFilter
          categories={categories}
          recordedValues={recordedValues}
          performers={performers}
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

      {favoriteVideos.length === 0 && (searchQuery || selectedCategories.length > 0) ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">No favorites found matching your criteria.</p>
        </div>
      ) : (
        <>
          {view === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {favoriteVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {favoriteVideos.map((video) => (
                <VideoCardList key={video.id} video={video} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
