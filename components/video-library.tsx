"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import VideoCard from "@/components/video-card"
import VideoCardList from "@/components/video-card-list"
import ViewToggle from "@/components/view-toggle"
import CategoryFilter from "@/components/category-filter"
import SortControl from "@/components/sort-control"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Loader2, X, Heart, Filter, ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface Video {
  id: string
  title: string
  description: string | null
  video_url: string
  thumbnail_url: string | null
  duration_seconds: number | null
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
  const storagePrefix = favoritesOnly ? "favoritesLibrary" : "videoLibrary"

  const [videos, setVideos] = useState<Video[]>([])
  const [allVideos, setAllVideos] = useState<Video[]>([]) // Store unfiltered videos for recorded values calculation
  const [userFavorites, setUserFavorites] = useState<Set<string>>(new Set())
  const [categories, setCategories] = useState<Category[]>([])
  const [performers, setPerformers] = useState<Performer[]>([])
  const [recordedValues, setRecordedValues] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [filterMode, setFilterMode] = useState<"AND" | "OR">("AND")

  const [view, setView] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") {
      const storageKey = `${storagePrefix}View`
      return (localStorage.getItem(storageKey) as "grid" | "list") || "grid"
    }
    return "grid"
  })

  const [sortBy, setSortBy] = useState<"title" | "created_at" | "recorded" | "performers" | "category" | "views">(
    () => {
      if (typeof window !== "undefined") {
        const storageKey = `${storagePrefix}SortBy`
        return (
          (localStorage.getItem(storageKey) as
            | "title"
            | "created_at"
            | "recorded"
            | "performers"
            | "category"
            | "views") || "category"
        )
      }
      return "category"
    },
  )

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() => {
    if (typeof window !== "undefined") {
      const storageKey = `${storagePrefix}SortOrder`
      return (localStorage.getItem(storageKey) as "asc" | "desc") || "asc"
    }
    return "asc"
  })

  const [currentPage, setCurrentPage] = useState(1)

  const [itemsPerPage, setItemsPerPage] = useState(() => {
    if (typeof window !== "undefined") {
      const storageKey = `${storagePrefix}ItemsPerPage`
      return Number.parseInt(localStorage.getItem(storageKey) || "10")
    }
    return 10
  })

  const [paginatedVideos, setPaginatedVideos] = useState<Video[]>([])

  const [user, setUser] = useState<any>(null)
  const [userLoading, setUserLoading] = useState(true)

  const supabase = createClient()

  const processedData = useMemo(() => {
    if (!allVideos.length) return { categories: [], performers: [], recordedValues: [] }

    const categoryMap = new Map<string, Category>()
    const performerMap = new Map<string, Performer>()
    const recordedSet = new Set<string>()

    // Single pass through all videos to extract unique categories, performers, and recorded values
    allVideos.forEach((video) => {
      // Extract categories
      video.categories?.forEach((category) => {
        if (category?.id && category?.name) {
          categoryMap.set(category.id, category)
        }
      })

      // Extract performers
      video.performers?.forEach((performer) => {
        if (performer?.id && performer?.name) {
          performerMap.set(performer.id, performer)
        }
      })

      // Extract recorded values
      if (video.recorded && video.recorded !== "Unset") {
        recordedSet.add(video.recorded)
      }
    })

    return {
      categories: Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      performers: Array.from(performerMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      recordedValues: Array.from(recordedSet),
    }
  }, [allVideos])

  useEffect(() => {
    const getUser = async () => {
      setUserLoading(true)
      try {
        const {
          data: { user: userData },
        } = await supabase.auth.getUser()
        setUser(userData)
      } catch (error) {
        console.error("Error getting user:", error)
      } finally {
        setUserLoading(false)
      }
    }
    getUser()
  }, [])

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
          if (userLoading) {
            setLoading(false)
            return
          }

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

        const processVideos = (rawData: any[]) => {
          const videoMap = new Map<string, Video>()

          rawData.forEach((item) => {
            const video = favoritesOnly ? item.videos : item

            if (!videoMap.has(video.id)) {
              videoMap.set(video.id, {
                ...video,
                categories: [],
                performers: [],
              })
            }

            const processedVideo = videoMap.get(video.id)!

            // Process categories efficiently
            video.video_categories?.forEach((vc: any) => {
              const category = vc.categories
              if (category?.id && category?.name && !processedVideo.categories.some((c) => c.id === category.id)) {
                processedVideo.categories.push(category)
              }
            })

            // Process performers efficiently
            video.video_performers?.forEach((vp: any) => {
              const performer = vp.performers
              if (performer?.id && performer?.name && !processedVideo.performers.some((p) => p.id === performer.id)) {
                processedVideo.performers.push(performer)
              }
            })
          })

          return Array.from(videoMap.values())
        }

        const processedVideos = processVideos(data || [])
        setAllVideos(processedVideos)

        if (favoritesOnly) {
          // On favorites page, all displayed videos are favorites
          const favoriteVideoIds = new Set(processedVideos.map((video) => video.id))
          setUserFavorites(favoriteVideoIds)
        } else if (user) {
          const videoIds = processedVideos.map((video) => video.id)
          await loadUserFavorites(videoIds)
        }

        setCachedData(favoritesOnly ? "favoriteVideos" : "videos", processedVideos)

        filterAndSortVideos(processedVideos)
        setLoading(false)
      } catch (error) {
        console.error("Error loading data:", error)
        setLoading(false)
      }
    }

    if (favoritesOnly && userLoading) {
      return
    }

    loadData()
  }, [favoritesOnly, user, userLoading])

  const loadUserFavorites = async (videoIds: string[]) => {
    if (!user || videoIds.length === 0) {
      setUserFavorites(new Set())
      return
    }

    try {
      const { data, error } = await supabase
        .from("user_favorites")
        .select("video_id")
        .eq("user_id", user.id)
        .in("video_id", videoIds)

      if (error) {
        console.error("Error loading user favorites:", error)
        setUserFavorites(new Set())
        return
      }

      const favoriteVideoIds = new Set(data?.map((fav) => fav.video_id) || [])
      setUserFavorites(favoriteVideoIds)
    } catch (error) {
      console.error("Error loading user favorites:", error)
      setUserFavorites(new Set())
    }
  }

  useEffect(() => {
    setCategories(processedData.categories)
    setPerformers(processedData.performers)
    setRecordedValues(processedData.recordedValues)
  }, [processedData])

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

  const totalPages = Math.ceil(videos.length / itemsPerPage)
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, videos.length)

  const PaginationControls = () => {
    const showNavigation = totalPages > 1

    return (
      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 min-w-0 flex-1">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-sm text-gray-400">Show</span>
              <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger className="w-20 bg-black/50 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
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
              <span className="text-sm text-gray-400">per page</span>
            </div>
            <div className="text-sm text-gray-400 whitespace-nowrap">
              Showing {startItem}-{endItem} of {videos.length} videos
            </div>
          </div>
        </div>

        {showNavigation && (
          <div className="flex justify-center">
            <div className="flex items-center gap-1">
              {/* Mobile: Simple prev/next with page indicator */}
              <div className="flex sm:hidden items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="h-9 px-3 text-white hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-400 px-3">
                  {currentPage} of {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="h-9 px-3 text-white hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Desktop: Full pagination */}
              <div className="hidden sm:block">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                        className={`${currentPage <= 1 ? "pointer-events-none opacity-50 text-gray-500" : "cursor-pointer hover:bg-gray-700 text-white hover:text-white"}`}
                      />
                    </PaginationItem>

                    {getVisiblePages().map((page, index) => (
                      <PaginationItem key={index}>
                        {page === "..." ? (
                          <PaginationEllipsis className="text-gray-300" />
                        ) : (
                          <PaginationLink
                            onClick={() => handlePageChange(page as number)}
                            isActive={currentPage === page}
                            className={`${currentPage === page ? "bg-red-600 text-white hover:bg-red-700 hover:text-white" : "text-white hover:text-white"}`}
                          >
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                        className={`${currentPage >= totalPages ? "pointer-events-none opacity-50 text-gray-500" : "cursor-pointer hover:bg-gray-700 text-white hover:text-white"}`}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const [showMobileFilters, setShowMobileFilters] = useState(false)

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  const handleViewChange = (newView: "grid" | "list") => {
    setView(newView)
    const storageKey = `${storagePrefix}View`
    localStorage.setItem(storageKey, newView)
  }

  const handleSortChange = (newSortBy: string, newSortOrder: "asc" | "desc") => {
    console.log("[v0] handleSortChange called:", {
      currentSortBy: sortBy,
      newSortBy,
      currentSortOrder: sortOrder,
      newSortOrder,
    })

    setSortBy(newSortBy as "title" | "created_at" | "recorded" | "performers" | "category" | "views")
    setSortOrder(newSortOrder)

    localStorage.setItem(`${storagePrefix}SortBy`, newSortBy)
    localStorage.setItem(`${storagePrefix}SortOrder`, newSortOrder)

    console.log("[v0] Sort state updated, calling filterAndSortVideos")
    filterAndSortVideos(
      allVideos,
      newSortBy as "title" | "created_at" | "recorded" | "performers" | "category" | "views",
      newSortOrder,
    )
  }

  const getVisiblePages = () => {
    const delta = 2
    const range = []
    const rangeWithDots = []

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...")
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages)
    } else {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }

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
    const cachedVideos = getCachedData(favoritesOnly ? "favoriteVideos" : "videos")

    if (cachedVideos) {
      setAllVideos(cachedVideos)
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

  const filterAndSortVideos = (
    videosToFilter = allVideos,
    sortByOverride?: "title" | "created_at" | "recorded" | "performers" | "category" | "views",
    sortOrderOverride?: "asc" | "desc",
  ) => {
    const currentSortBy = sortByOverride || sortBy
    const currentSortOrder = sortOrderOverride || sortOrder

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
          (id) => !id.startsWith("recorded:") && !id.startsWith("performer:") && !id.startsWith("views:"),
        )
        const selectedRecordedValues = selectedCategories
          .filter((id) => id.startsWith("recorded:"))
          .map((id) => id.replace("recorded:", ""))
        const selectedPerformerIds = selectedCategories
          .filter((id) => id.startsWith("performer:"))
          .map((id) => id.replace("performer:", ""))
        const selectedViews = selectedCategories
          .filter((id) => id.startsWith("views:"))
          .map((id) => id.replace("views:", ""))

        let categoryMatches = selectedCategoryIds.length === 0 ? true : false
        let recordedMatches = selectedRecordedValues.length === 0 ? true : false
        let performerMatches = selectedPerformerIds.length === 0 ? true : false
        let viewsMatches = selectedViews.length === 0 ? true : false

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

        if (selectedViews.length > 0) {
          const videoViews = video.views || 0
          const selectedViewNumbers = selectedViews.map(Number)
          if (filterMode === "AND") {
            viewsMatches = selectedViewNumbers.every((selectedView) => videoViews >= selectedView)
          } else {
            viewsMatches = selectedViewNumbers.some((selectedView) => videoViews >= selectedView)
          }
        }

        const activeFilters = [
          selectedCategoryIds.length > 0 ? categoryMatches : null,
          selectedRecordedValues.length > 0 ? recordedMatches : null,
          selectedPerformerIds.length > 0 ? performerMatches : null,
          selectedViews.length > 0 ? viewsMatches : null,
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

      switch (currentSortBy) {
        case "category":
          aValue = a.categories.length > 0 ? a.categories[0].name.toLowerCase() : "zzz_uncategorized" // Use a value that sorts last alphabetically
          bValue = b.categories.length > 0 ? b.categories[0].name.toLowerCase() : "zzz_uncategorized" // Use a value that sorts last alphabetically
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
        case "views":
          aValue = a.views || 0
          bValue = b.views || 0
          break
        default:
          aValue = a.categories.length > 0 ? a.categories[0].name.toLowerCase() : "zzz_uncategorized" // Use a value that sorts last alphabetically
          bValue = b.categories.length > 0 ? b.categories[0].name.toLowerCase() : "zzz_uncategorized" // Use a value that sorts last alphabetically
      }

      let result = 0
      if (currentSortOrder === "asc") {
        result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        result = aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }

      if (result === 0 && currentSortBy === "category") {
        const aTitle = a.title.toLowerCase()
        const bTitle = b.title.toLowerCase()
        if (currentSortOrder === "asc") {
          result = aTitle < bTitle ? -1 : aTitle > bTitle ? 1 : 0
        } else {
          result = aTitle > bTitle ? -1 : aTitle < bTitle ? 1 : 0
        }
      }

      // If categories are equal, use title as tertiary sort
      if (result === 0 && currentSortBy !== "category") {
        const aCategory = a.categories.length > 0 ? a.categories[0].name.toLowerCase() : "zzz_uncategorized" // Use a value that sorts last alphabetically
        const bCategory = b.categories.length > 0 ? b.categories[0].name.toLowerCase() : "zzz_uncategorized" // Use a value that sorts last alphabetically
        result = aCategory < bCategory ? -1 : aCategory > bCategory ? 1 : 0

        // If categories are equal, use title as tertiary sort
        if (result === 0) {
          const aTitle = a.title.toLowerCase()
          const bTitle = b.title.toLowerCase()
          result = aTitle < bTitle ? -1 : aTitle > bTitle ? 1 : 0
        }
      }

      return result
    })

    setVideos(filteredVideos)
    setCurrentPage(1)
    updatePaginatedVideos(filteredVideos, 1, itemsPerPage)
  }

  const updatePaginatedVideos = (allFilteredVideos: Video[], page: number, perPage: number) => {
    const startIndex = (page - 1) * perPage
    const endIndex = startIndex + perPage
    const paginated = allFilteredVideos.slice(startIndex, endIndex)
    setPaginatedVideos(paginated)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    updatePaginatedVideos(videos, page, itemsPerPage)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = Number.parseInt(value)
    const storageKey = `${storagePrefix}ItemsPerPage`
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
    localStorage.setItem(storageKey, value)
    updatePaginatedVideos(videos, 1, newItemsPerPage)
  }

  useEffect(() => {
    updatePaginatedVideos(videos, currentPage, itemsPerPage)
  }, [videos, currentPage, itemsPerPage])

  if (loading || userLoading) {
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
        <div className="space-y-4">
          {/* Search bar - full width on mobile */}
          <div className="relative w-full max-w-md">
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
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Controls row - responsive layout */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Mobile filter button */}
              <Dialog open={showMobileFilters} onOpenChange={setShowMobileFilters}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="lg:hidden bg-black/50 border-gray-700 text-white hover:bg-gray-700 hover:text-white"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                    {selectedCategories.length > 0 && (
                      <span className="ml-2 bg-red-600 text-white text-xs rounded-full px-2 py-0.5">
                        {selectedCategories.length}
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
                            onClick={() => setFilterMode("AND")}
                            className={`text-xs px-3 py-1 flex-1 ${
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
                            className={`text-xs px-3 py-1 flex-1 ${
                              filterMode === "OR"
                                ? "bg-red-600 text-white hover:bg-red-700"
                                : "text-gray-400 hover:text-white hover:bg-gray-800"
                            }`}
                          >
                            OR
                          </Button>
                        </div>
                      </div>
                    )}
                    <Button
                      onClick={() => setShowMobileFilters(false)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                    >
                      Apply Filters
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Sort control - responsive */}
              <div className="flex-1 sm:flex-none">
                <SortControl sortBy={sortBy} sortOrder={sortOrder} onSortChange={handleSortChange} />
              </div>
            </div>

            {/* View toggle - larger touch targets on mobile */}
            <div className="w-full sm:w-auto">
              <ViewToggle view={view} onViewChange={handleViewChange} />
            </div>
          </div>
        </div>

        <div className="hidden lg:block">
          <CategoryFilter
            categories={categories}
            recordedValues={recordedValues}
            performers={performers}
            selectedCategories={selectedCategories}
            onCategoryToggle={handleCategoryToggle}
            videoCount={videos.length}
          />

          {selectedCategories.length > 1 && (
            <div className="flex items-center gap-2 mt-4">
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
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">
            {favoritesOnly ? "No favorites found matching your criteria." : "No videos found matching your criteria."}
          </p>
        </div>
      ) : (
        <>
          <PaginationControls />

          {view === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedVideos.map((video) => (
                <VideoCard key={video.id} video={video} isFavorited={userFavorites.has(video.id)} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedVideos.map((video) => (
                <VideoCardList key={video.id} video={video} isFavorited={userFavorites.has(video.id)} />
              ))}
            </div>
          )}

          <PaginationControls />
        </>
      )}
    </div>
  )
}
