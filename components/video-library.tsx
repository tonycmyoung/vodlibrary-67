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
import { Search, Loader2, X, Heart } from "lucide-react"

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

interface VideoLibraryProps {
  favoritesOnly?: boolean
}

let lastFailureTime = 0
let failureCount = 0
const CIRCUIT_BREAKER_THRESHOLD = 3
const CIRCUIT_BREAKER_TIMEOUT = 30000 // 30 seconds
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 60000 // 1 minute

export default function VideoLibrary({ favoritesOnly = false }: VideoLibraryProps) {
  const [videos, setVideos] = useState<Video[]>([])
  const [allVideos, setAllVideos] = useState<Video[]>([]) // Store unfiltered videos for recorded values calculation
  const [categories, setCategories] = useState<Category[]>([])
  const [performers, setPerformers] = useState<Performer[]>([])
  const [recordedValues, setRecordedValues] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [filterMode, setFilterMode] = useState<"AND" | "OR">("AND")

  const storagePrefix = favoritesOnly ? "favoritesLibrary" : "videoLibrary"

  const [sortBy, setSortBy] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`${storagePrefix}SortBy`) || "title"
    }
    return "title"
  })
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(`${storagePrefix}SortOrder`) as "asc" | "desc") || "asc"
    }
    return "asc"
  })
  const [view, setView] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(`${storagePrefix}View`) as "grid" | "list") || "grid"
    }
    return "grid"
  })

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)

      if (isCircuitBreakerOpen()) {
        console.log("Circuit breaker is open, using cached data if available")
        loadFromCache()
        setLoading(false)
        return
      }

      try {
        let query

        if (favoritesOnly) {
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (!user) {
            setLoading(false)
            return
          }

          // Get favorites with all related data in one query
          query = supabase
            .from("user_favorites")
            .select(
              `
              videos!inner(
                *,
                video_categories(
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
        } else {
          // Get all videos with related data in one query
          query = supabase
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
            .eq("is_published", true)
        }

        const { data, error } = await query

        if (error) {
          console.error("Error fetching data:", error)
          setLoading(false)
          return
        }

        // Process the data to extract videos, categories, and performers
        let videosWithCategoriesAndPerformers
        const allCategories = new Map<string, Category>()
        const allPerformers = new Map<string, Performer>()

        if (favoritesOnly) {
          videosWithCategoriesAndPerformers = data?.reduce((acc: Video[], favorite: any) => {
            const video = favorite.videos
            const existingVideo = acc.find((v) => v.id === video.id)

            const videoCategories = video.video_categories || []
            const videoPerformers = video.video_performers || []

            videoCategories.forEach((vc: any) => {
              if (vc.categories && vc.categories.id) {
                allCategories.set(vc.categories.id, vc.categories)
              }
            })
            videoPerformers.forEach((vp: any) => {
              if (vp.performers && vp.performers.id) {
                allPerformers.set(vp.performers.id, vp.performers)
              }
            })

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
        } else {
          videosWithCategoriesAndPerformers = data?.reduce((acc: Video[], video: any) => {
            const existingVideo = acc.find((v) => v.id === video.id)

            const videoCategories = video.video_categories || []
            const videoPerformers = video.video_performers || []

            videoCategories.forEach((vc: any) => {
              if (vc.categories && vc.categories.id) {
                allCategories.set(vc.categories.id, vc.categories)
              }
            })
            videoPerformers.forEach((vp: any) => {
              if (vp.performers && vp.performers.id) {
                allPerformers.set(vp.performers.id, vp.performers)
              }
            })

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
        }

        const allVideosData = videosWithCategoriesAndPerformers || []

        setAllVideos(allVideosData)
        setCategories(Array.from(allCategories.values()).sort((a, b) => a.name.localeCompare(b.name)))
        setPerformers(Array.from(allPerformers.values()).sort((a, b) => a.name.localeCompare(b.name)))

        // Calculate recorded values
        const uniqueRecorded = [...new Set(allVideosData.map((v) => v.recorded).filter((r) => r && r !== "Unset"))]
        setRecordedValues(uniqueRecorded)

        setCachedData("categories", Array.from(allCategories.values()))
        setCachedData("performers", Array.from(allPerformers.values()))
        setCachedData(favoritesOnly ? "favoriteVideos" : "videos", allVideosData)

        filterAndSortVideos(allVideosData)
        setLoading(false)
      } catch (error) {
        console.error("Error loading data:", error)
        setLoading(false)
      }
    }

    loadData()
  }, [favoritesOnly])

  useEffect(() => {
    if (allVideos.length > 0) {
      filterAndSortVideos()
    }
  }, [selectedCategories, debouncedSearchQuery, filterMode, allVideos])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300) // 300ms delay

    return () => clearTimeout(timer)
  }, [searchQuery])

  const isCircuitBreakerOpen = () => {
    if (failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
      const timeSinceLastFailure = Date.now() - lastFailureTime
      if (timeSinceLastFailure < CIRCUIT_BREAKER_TIMEOUT) {
        return true
      } else {
        failureCount = 0
        lastFailureTime = 0
        return false
      }
    }
    return false
  }

  const recordFailure = () => {
    failureCount++
    lastFailureTime = Date.now()
  }

  const recordSuccess = () => {
    failureCount = 0
    lastFailureTime = 0
  }

  const getCachedData = (key: string) => {
    const cached = cache.get(key)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }
    return null
  }

  const setCachedData = (key: string, data: any) => {
    cache.set(key, { data, timestamp: Date.now() })
  }

  const loadFromCache = () => {
    const cachedCategories = getCachedData("categories")
    const cachedPerformers = getCachedData("performers")
    const cachedVideos = getCachedData(favoritesOnly ? "favoriteVideos" : "videos")

    if (cachedCategories) setCategories(cachedCategories)
    if (cachedPerformers) setPerformers(cachedPerformers)
    if (cachedVideos) {
      setAllVideos(cachedVideos)
      const uniqueRecorded = [
        ...new Set(cachedVideos.map((v: Video) => v.recorded).filter((r: string | null) => r && r !== "Unset")),
      ]
      setRecordedValues(uniqueRecorded)
      filterAndSortVideos(cachedVideos)
    }
  }

  const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 5, baseDelay = 2000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await fn()
        recordSuccess()
        return result
      } catch (error: any) {
        const isRateLimit =
          error.message?.includes("Too Many") ||
          error.message?.includes("rate limit") ||
          error.message?.includes("Internal S")

        if (isRateLimit && i < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, i) + Math.random() * 2000
          console.log(`Rate limited, retrying in ${delay}ms (attempt ${i + 1}/${maxRetries})`)
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
        recordFailure()
        throw error
      }
    }
  }

  const filterAndSortVideos = (videosToFilter = allVideos) => {
    let filteredVideos = [...videosToFilter]

    if (debouncedSearchQuery) {
      filteredVideos = filteredVideos.filter((video) => {
        const titleMatch = video.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
        const descriptionMatch = video.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || false
        const performerMatch = video.performers.some((performer) =>
          performer.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()),
        )

        return titleMatch || descriptionMatch || performerMatch
      })
    }

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

      if (result === 0 && sortBy !== "title") {
        const aTitle = a.title.toLowerCase()
        const bTitle = b.title.toLowerCase()
        result = aTitle < bTitle ? -1 : aTitle > bTitle ? 1 : 0
      }

      return result
    })

    setVideos(filteredVideos)
  }

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  const handleViewChange = (newView: "grid" | "list") => {
    setView(newView)
    localStorage.setItem(`${storagePrefix}View`, newView)
  }

  const handleSortChange = (newSortBy: string, newSortOrder: "asc" | "desc") => {
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)

    localStorage.setItem(`${storagePrefix}SortBy`, newSortBy)
    localStorage.setItem(`${storagePrefix}SortOrder`, newSortOrder)

    filterAndSortVideos()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        <span className="ml-2 text-gray-300">{favoritesOnly ? "Loading your favorites..." : "Loading videos..."}</span>
      </div>
    )
  }

  if (videos.length === 0 && !debouncedSearchQuery && selectedCategories.length === 0) {
    if (favoritesOnly) {
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
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={favoritesOnly ? "Search favorites..." : "Search videos..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 bg-black/50 border-gray-700 text-white placeholder:text-gray-400 focus:border-red-500"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
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
          videoCount={videos.length}
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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          <span className="ml-2 text-gray-300">Loading videos...</span>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">
            {favoritesOnly ? "No favorites found matching your criteria." : "No videos found matching your criteria."}
          </p>
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
