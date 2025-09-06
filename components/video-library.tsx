"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import VideoCard from "@/components/video-card"
import VideoCardList from "@/components/video-card-list"
import ViewToggle from "@/components/view-toggle"
import CategoryFilter from "@/components/category-filter"
import SortControl from "@/components/sort-control"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const storagePrefix = favoritesOnly ? "favoritesLibrary" : "videoLibrary"

  const [urlState, setUrlState] = useState(() => {
    const filters = searchParams.get("filters")
    const search = searchParams.get("search") || ""
    const mode = (searchParams.get("mode") as "AND" | "OR") || "AND"
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10))

    let parsedFilters: string[] = []
    if (filters) {
      try {
        parsedFilters = JSON.parse(decodeURIComponent(filters))
      } catch (e) {
        console.error("Error parsing URL filters:", e)
      }
    }

    return { filters: parsedFilters, search, mode, page }
  })

  const [videos, setVideos] = useState<Video[]>([])
  const [allVideos, setAllVideos] = useState<Video[]>([])
  const [userFavorites, setUserFavorites] = useState<Set<string>>(new Set())
  const [categories, setCategories] = useState<Category[]>([])
  const [performers, setPerformers] = useState<Performer[]>([])
  const [recordedValues, setRecordedValues] = useState<string[]>([])
  const [view, setView] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") {
      const storageKey = `${storagePrefix}View`
      return (localStorage.getItem(storageKey) as "grid" | "list") || "grid"
    }
    return "grid"
  })

  const [selectedCategories, setSelectedCategories] = useState<string[]>(urlState.filters)
  const [searchQuery, setSearchQuery] = useState(urlState.search)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [filterMode, setFilterMode] = useState<"AND" | "OR">(urlState.mode)
  const [currentPage, setCurrentPage] = useState(urlState.page)

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

    allVideos.forEach((video) => {
      video.categories?.forEach((category) => {
        if (category?.id && category?.name) {
          categoryMap.set(category.id, category)
        }
      })

      video.performers?.forEach((performer) => {
        if (performer?.id && performer?.name) {
          performerMap.set(performer.id, performer)
        }
      })

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
    let mounted = true
    const getUser = async () => {
      if (!mounted) return
      setUserLoading(true)
      try {
        const {
          data: { user: userData },
        } = await supabase.auth.getUser()
        if (mounted) setUser(userData)
      } catch (error) {
        console.error("Error getting user:", error)
      } finally {
        if (mounted) setUserLoading(false)
      }
    }
    getUser()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const loadData = async () => {
      if (!mounted) return
      setLoading(true)

      if (isCircuitBreakerOpen()) {
        console.log("Circuit breaker is open, using cached data if available")
        loadFromCache()
        if (mounted) setLoading(false)
        return
      }

      try {
        const [videosResult, favoritesResult, categoriesResult, performersResult] = await Promise.all([
          supabase
            .from("videos")
            .select(`
              id, title, description, video_url, thumbnail_url, duration_seconds, 
              created_at, recorded, views, updated_at
            `)
            .order("created_at", { ascending: false }),

          user
            ? supabase.from("user_favorites").select("video_id").eq("user_id", user.id)
            : Promise.resolve({ data: [], error: null }),

          supabase.from("video_categories").select(`
              video_id,
              categories(id, name, color)
            `),

          supabase.from("video_performers").select(`
              video_id,
              performers(id, name)
            `),
        ])

        if (!mounted) return

        if (videosResult.error) {
          recordCircuitBreakerFailure()
          throw videosResult.error
        }

        const videosWithMetadata =
          videosResult.data?.map((video) => {
            const videoCategories =
              categoriesResult.data?.filter((vc) => vc.video_id === video.id).map((vc) => vc.categories) || []

            const videoPerformers =
              performersResult.data?.filter((vp) => vp.video_id === video.id).map((vp) => vp.performers) || []

            return {
              ...video,
              categories: videoCategories,
              performers: videoPerformers,
            }
          }) || []

        recordCircuitBreakerSuccess()
        saveToCache(videosWithMetadata)

        if (mounted) {
          setAllVideos(videosWithMetadata)
          setUserFavorites(new Set(favoritesResult.data?.map((f) => f.video_id) || []))
        }
      } catch (error) {
        console.error("Error loading data:", error)
        recordCircuitBreakerFailure()
        loadFromCache()
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadData()
    return () => {
      mounted = false
    }
  }, [user, favoritesOnly])

  const loadFromCache = () => {
    const cachedVideos = getCachedData(favoritesOnly ? "favoriteVideos" : "videos")

    if (cachedVideos) {
      setAllVideos(cachedVideos)
    }
  }

  const saveToCache = (data: Video[]) => {
    setCachedData(favoritesOnly ? "favoriteVideos" : "videos", data)
  }

  const setCachedData = (key: string, data: any) => {
    cache.set(key, { data, timestamp: Date.now() })
  }

  const getCachedData = (key: string) => {
    const cached = cache.get(key)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }
    return null
  }

  const recordCircuitBreakerFailure = () => {
    failureCount++
    lastFailureTime = Date.now()
  }

  const recordCircuitBreakerSuccess = () => {
    failureCount = 0
    lastFailureTime = 0
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

  useEffect(() => {
    setCategories(processedData.categories)
    setPerformers(processedData.performers)
    setRecordedValues(processedData.recordedValues)
  }, [processedData])

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

  const processedVideos = useMemo(() => {
    let result = [...allVideos]

    if (debouncedSearchQuery) {
      result = result.filter((video) => {
        const titleMatch = video.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
        const descriptionMatch = video.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || false
        const performerMatch = video.performers.some((performer) =>
          performer.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()),
        )
        return titleMatch || descriptionMatch || performerMatch
      })
    }

    if (selectedCategories.length > 0) {
      result = result.filter((video) => {
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

        return filterMode === "AND" ? activeFilters.every((match) => match) : activeFilters.some((match) => match)
      })
    }

    result.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "title":
          comparison = a.title.localeCompare(b.title)
          break
        case "created_at":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case "recorded":
          comparison = (a.recorded || "").localeCompare(b.recorded || "")
          break
        case "performers":
          const aPerformers = a.performers.map((p) => p.name).join(", ")
          const bPerformers = b.performers.map((p) => p.name).join(", ")
          comparison = aPerformers.localeCompare(bPerformers)
          break
        case "category":
          const aCategories = a.categories.map((c) => c.name).join(", ")
          const bCategories = b.categories.map((c) => c.name).join(", ")

          // If sorting ascending and one video has no categories, put it at the end
          if (sortOrder === "asc") {
            if (!aCategories && bCategories) return 1
            if (aCategories && !bCategories) return -1
          }

          comparison = aCategories.localeCompare(bCategories)
          break
        case "views":
          comparison = (a.views || 0) - (b.views || 0)
          break
      }

      // If primary sort values are equal and we're not sorting by title, use title as secondary sort
      if (comparison === 0 && sortBy !== "title") {
        comparison = a.title.localeCompare(b.title)
      }

      return sortOrder === "asc" ? comparison : -comparison
    })

    return result
  }, [allVideos, debouncedSearchQuery, selectedCategories, filterMode, sortBy, sortOrder])

  const totalPages = Math.ceil(processedVideos.length / itemsPerPage)
  const validCurrentPage = Math.max(1, Math.min(currentPage, totalPages || 1))

  const paginatedResult = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return processedVideos.slice(startIndex, endIndex)
  }, [processedVideos, validCurrentPage, itemsPerPage])

  useEffect(() => {
    setVideos(processedVideos)
    setPaginatedVideos(paginatedResult)
  }, [processedVideos, paginatedResult])

  const [showMobileFilters, setShowMobileFilters] = useState(false)

  const reconstructURL = (filters: string[], search: string, mode: "AND" | "OR", page: number) => {
    const params = new URLSearchParams()

    if (filters.length > 0) {
      params.set("filters", encodeURIComponent(JSON.stringify(filters)))
    }

    if (search.trim()) {
      params.set("search", search)
    }

    if (mode !== "AND") {
      params.set("mode", mode)
    }

    if (page > 1) {
      params.set("page", page.toString())
    }

    const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname
    router.replace(newURL, { scroll: false })
  }

  const handleCategoryToggle = (categoryId: string) => {
    const newSelectedCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter((id) => id !== categoryId)
      : [...selectedCategories, categoryId]

    setSelectedCategories(newSelectedCategories)
    reconstructURL(newSelectedCategories, searchQuery, filterMode, 1) // Reset to page 1 when filters change
  }

  const handleViewChange = (newView: "grid" | "list") => {
    setView(newView)
    const storageKey = `${storagePrefix}View`
    localStorage.setItem(storageKey, newView)
  }

  const handleSortChange = (newSortBy: string, newSortOrder: "asc" | "desc") => {
    setSortBy(newSortBy as "title" | "created_at" | "recorded" | "performers" | "category" | "views")
    setSortOrder(newSortOrder)

    localStorage.setItem(`${storagePrefix}SortBy`, newSortBy)
    localStorage.setItem(`${storagePrefix}SortOrder`, newSortOrder)
  }

  const handleFilterModeChange = (newMode: "AND" | "OR") => {
    setFilterMode(newMode)
    reconstructURL(selectedCategories, searchQuery, newMode, 1) // Reset to page 1 when filter mode changes
  }

  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = Number.parseInt(value, 10)
    setItemsPerPage(newItemsPerPage)
    localStorage.setItem(`${storagePrefix}ItemsPerPage`, value)
    reconstructURL(selectedCategories, searchQuery, filterMode, 1) // Reset to page 1 when items per page changes
  }

  const handlePageChange = (newPage: number) => {
    const boundedPage = Math.max(1, Math.min(newPage, totalPages || 1))
    setCurrentPage(boundedPage)
    reconstructURL(selectedCategories, searchQuery, filterMode, boundedPage)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      reconstructURL(selectedCategories, searchQuery, filterMode, 1) // Reset to page 1 when search changes
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (validCurrentPage !== currentPage && totalPages > 0) {
      setCurrentPage(validCurrentPage)
      reconstructURL(selectedCategories, searchQuery, filterMode, validCurrentPage)
    }
  }, [validCurrentPage, currentPage, totalPages])

  const PaginationControls = () => {
    const showNavigation = totalPages > 1

    return (
      <div className="flex flex-col gap-3 py-3 sm:gap-4 sm:py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 min-w-0 flex-1">
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
            {showNavigation ? (
              <div className="flex sm:hidden items-center gap-2 text-sm text-gray-400 whitespace-nowrap">
                <span>
                  Showing {validCurrentPage * itemsPerPage - itemsPerPage + 1}-
                  {Math.min(validCurrentPage * itemsPerPage, processedVideos.length)} of {processedVideos.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="h-7 px-2 text-white hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="px-1">
                  {validCurrentPage} of {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="h-7 px-2 text-white hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="text-sm text-gray-400 whitespace-nowrap sm:block">
                Showing {validCurrentPage * itemsPerPage - itemsPerPage + 1}-
                {Math.min(validCurrentPage * itemsPerPage, processedVideos.length)} of {processedVideos.length}
              </div>
            )}
            <div className="hidden sm:block text-sm text-gray-400 whitespace-nowrap">
              Showing {validCurrentPage * itemsPerPage - itemsPerPage + 1}-
              {Math.min(validCurrentPage * itemsPerPage, processedVideos.length)} of {processedVideos.length} videos
            </div>
          </div>

          {showNavigation && (
            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="text-white hover:bg-gray-700 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {(() => {
                  const pages = []

                  if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i++) {
                      pages.push(i)
                    }
                  } else {
                    pages.push(1)

                    if (currentPage <= 4) {
                      for (let i = 2; i <= 5; i++) {
                        pages.push(i)
                      }
                      if (totalPages > 6) {
                        pages.push("ellipsis")
                        pages.push(totalPages)
                      }
                    } else if (currentPage >= totalPages - 3) {
                      if (totalPages > 6) {
                        pages.push("ellipsis")
                      }
                      for (let i = totalPages - 4; i <= totalPages; i++) {
                        pages.push(i)
                      }
                    } else {
                      pages.push("ellipsis")
                      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                        pages.push(i)
                      }
                      pages.push("ellipsis")
                      pages.push(totalPages)
                    }
                  }

                  return pages.map((page, index) => {
                    if (page === "ellipsis") {
                      return (
                        <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                          ...
                        </span>
                      )
                    }

                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handlePageChange(page as number)}
                        disabled={page === currentPage}
                        className={`w-8 h-8 p-0 ${
                          page === currentPage
                            ? "bg-red-600 text-white hover:bg-red-700"
                            : "text-white hover:bg-gray-700"
                        }`}
                      >
                        {page}
                      </Button>
                    )
                  })
                })()}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="text-white hover:bg-gray-700 disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        <span className="ml-2 text-gray-900">{favoritesOnly ? "Loading your favorites..." : "Loading videos..."}</span>
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
    <div className="container mx-auto px-4 py-4 sm:py-8">
      <div className="mb-4 sm:mb-8 space-y-3 sm:space-y-6">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
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

            <ViewToggle view={view} onViewChange={handleViewChange} />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
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
                            onClick={() => handleFilterModeChange("AND")}
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
                            onClick={() => handleFilterModeChange("OR")}
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

              <div className="flex-1 sm:flex-none">
                <SortControl sortBy={sortBy} sortOrder={sortOrder} onSortChange={handleSortChange} />
              </div>
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
                  onClick={() => handleFilterModeChange("AND")}
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
                  onClick={() => handleFilterModeChange("OR")}
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
