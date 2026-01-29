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
import { Search, Loader2, X, Heart, Filter, Ribbon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { getBatchVideoViewCounts } from "@/lib/actions/videos"
import {
  compareVideos,
  videoMatchesSearch,
  videoMatchesFilters,
  type VideoLibrarySortBy,
} from "@/lib/video-sorting"

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
    description: string | null
  }>
  curriculums: Array<{
    id: string
    name: string
    color: string
    display_order: number
    description: string | null
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
  description: string | null
}

interface Curriculum {
  id: string
  name: string
  color: string
  display_order: number
  description: string | null
}

interface Performer {
  id: string
  name: string
}

interface VideoLibraryProps {
  favoritesOnly?: boolean
  maxCurriculumOrder?: number // Added optional curriculum filtering for My Level page
  storagePrefix?: string // Allow custom storage prefix for separate UI state
  nextBeltName?: string // Add prop for next belt name
  userProfile?: any // Added prop for user profile
}

const PaginationControls = ({
  totalPages,
  itemsPerPage,
  handleItemsPerPageChange,
  currentPage,
  handlePageChange,
}: {
  totalPages: number
  itemsPerPage: number
  handleItemsPerPageChange: (value: string) => void
  currentPage: number
  handlePageChange: (page: number) => void
}) => {
  const showNavigation = totalPages > 1

  return (
    <div className="flex flex-col gap-2 py-2 sm:gap-3 sm:py-3">
      <div className="flex flex-col flex-row items-start items-center justify-between gap-2 gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-sm text-gray-400">Show</span>
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-20 bg-black/50 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-black border-gray-700">
              <SelectItem value="12">12</SelectItem>
              <SelectItem value="24">24</SelectItem>
              <SelectItem value="48">48</SelectItem>
              <SelectItem value="96">96</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-400">per page</span>
        </div>

        {showNavigation && (
          <div className="flex items-center gap-1 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="h-8 px-2 text-white hover:bg-gray-800 disabled:opacity-50"
            >
              First
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8 px-2 text-white hover:bg-gray-800 disabled:opacity-50"
            >
              Previous
            </Button>

            {(() => {
              const pages = []
              const maxVisible = 5
              let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
              const endPage = Math.min(totalPages, startPage + maxVisible - 1)

              if (endPage - startPage + 1 < maxVisible) {
                startPage = Math.max(1, endPage - maxVisible + 1)
              }

              if (startPage > 1) {
                pages.push(
                  <Button
                    key={1}
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    className="h-8 w-8 p-0 text-white hover:bg-gray-800"
                  >
                    1
                  </Button>,
                )
                if (startPage > 2) {
                  pages.push(
                    <span key={`ellipsis-${currentPage}-start`} className="px-2 text-gray-400">
                      ...
                    </span>,
                  )
                }
              }

              for (let i = startPage; i <= endPage; i++) {
                pages.push(
                  <Button
                    key={i}
                    variant={currentPage === i ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handlePageChange(i)}
                    className={`h-8 w-8 p-0 ${
                      currentPage === i ? "bg-blue-600 text-white hover:bg-blue-700" : "text-white hover:bg-gray-800"
                    }`}
                  >
                    {i}
                  </Button>,
                )
              }

              if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                  pages.push(
                    <span key={`ellipsis-${currentPage}-end`} className="px-2 text-gray-400">
                      ...
                    </span>,
                  )
                }
                pages.push(
                  <Button
                    key={totalPages}
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                    className="h-8 w-8 p-0 text-white hover:bg-gray-800"
                  >
                    {totalPages}
                  </Button>,
                )
              }

              return pages
            })()}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8 px-2 text-white hover:bg-gray-800 disabled:opacity-50"
            >
              Next
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="h-8 px-2 text-white hover:bg-gray-800 disabled:opacity-50"
            >
              Last
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// Loading state component
const LoadingState = ({ favoritesOnly }: { favoritesOnly: boolean }) => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="w-8 h-8 animate-spin text-red-500" />
    <span className="ml-2 text-gray-900">{favoritesOnly ? "Loading your favorites..." : "Loading videos..."}</span>
  </div>
)

// Empty favorites state component
const EmptyFavoritesState = () => (
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

// Training banner component - mobile version
const MobileTrainingBanner = ({ nextBeltName }: { nextBeltName?: string }) => (
  <div className="mb-3 sm:mb-0 flex items-center gap-2 px-4 py-2 bg-black/30 border border-red-800/30 rounded-lg sm:hidden">
    <Ribbon className="w-4 h-4 text-red-500" />
    <span className="text-sm text-gray-300">
      Training for: <span className="font-semibold text-white">{nextBeltName || "Next Level"}</span>
    </span>
  </div>
)

// Training banner component - desktop version
const DesktopTrainingBanner = ({ nextBeltName }: { nextBeltName?: string }) => (
  <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-black/30 border border-red-800/30 rounded-lg whitespace-nowrap">
    <Ribbon className="w-4 h-4 text-red-500 flex-shrink-0" />
    <span className="text-sm text-gray-300">
      Training for: <span className="font-semibold text-white">{nextBeltName || "Next Level"}</span>
    </span>
  </div>
)

const FilterSection = ({
  categories,
  recordedValues,
  performers,
  selectedCategories,
  onCategoryToggle,
  videoCount,
  curriculums,
  selectedCurriculums,
  onCurriculumToggle,
}: {
  categories: any[]
  recordedValues: any[]
  performers: any[]
  selectedCategories: string[]
  onCategoryToggle: (id: string) => void
  videoCount: number
  curriculums: any[]
  selectedCurriculums: string[]
  onCurriculumToggle: (id: string) => void
}) => (
  <div className="space-y-6">
    <CategoryFilter
      categories={categories}
      recordedValues={recordedValues}
      performers={performers}
      selectedCategories={selectedCategories}
      onCategoryToggle={onCategoryToggle}
      videoCount={videoCount}
      curriculums={curriculums}
      selectedCurriculums={selectedCurriculums}
      onCurriculumToggle={onCurriculumToggle}
    />
  </div>
)

let lastFailureTime = 0
let failureCount = 0
const CIRCUIT_BREAKER_THRESHOLD = 3
const CIRCUIT_BREAKER_TIMEOUT = 30000 // 30 seconds
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 60000 // 1 minute

// Circuit breaker helper functions - extracted to reduce cognitive complexity
function recordCircuitBreakerFailure() {
  failureCount++
  lastFailureTime = Date.now()
}

function recordCircuitBreakerSuccess() {
  failureCount = 0
  lastFailureTime = 0
}

function resetCircuitBreaker() {
  failureCount = 0
  lastFailureTime = 0
}

function isCircuitBreakerTimedOut(): boolean {
  const timeSinceLastFailure = Date.now() - lastFailureTime
  return timeSinceLastFailure >= CIRCUIT_BREAKER_TIMEOUT
}

function isCircuitBreakerOpen(): boolean {
  if (failureCount < CIRCUIT_BREAKER_THRESHOLD) return false
  if (isCircuitBreakerTimedOut()) {
    resetCircuitBreaker()
    return false
  }
  return true
}

// Cache helper functions
function setCachedData(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() })
}

function getCachedData(key: string) {
  const cached = cache.get(key)
  const isValid = cached && Date.now() - cached.timestamp < CACHE_DURATION
  return isValid ? cached.data : null
}

// URL filter separator - extracted to reduce cognitive complexity
function separateUrlFilters(
  filters: string[],
  categoryIds: Set<string>,
  curriculumIds: Set<string>
): { categories: string[]; curriculums: string[] } {
  const categories: string[] = []
  const curriculums: string[] = []

  for (const filterId of filters) {
    const isPrefixedFilter =
      filterId.startsWith("recorded:") ||
      filterId.startsWith("performer:") ||
      filterId.startsWith("views:")

    if (categoryIds.has(filterId) || isPrefixedFilter) {
      categories.push(filterId)
    } else if (curriculumIds.has(filterId)) {
      curriculums.push(filterId)
    }
  }

  return { categories, curriculums }
}

// Helper functions to reduce nesting in video data processing
function getVideoCategoriesForVideo(
  videoId: string,
  categoriesData: Array<{ video_id: string; categories: Category }> | null
): Category[] {
  if (!categoriesData) return []
  return categoriesData
    .filter((vc) => vc.video_id === videoId)
    .map((vc) => vc.categories)
}

function getVideoCurriculumsForVideo(
  videoId: string,
  curriculumsData: Array<{ video_id: string; curriculums: Curriculum }> | null
): Curriculum[] {
  if (!curriculumsData) return []
  return curriculumsData
    .filter((vc) => vc.video_id === videoId)
    .map((vc) => vc.curriculums)
}

function getVideoPerformersForVideo(
  videoId: string,
  performersData: Array<{ video_id: string; performers: Performer }> | null
): Performer[] {
  if (!performersData) return []
  return performersData
    .filter((vp) => vp.video_id === videoId)
    .map((vp) => vp.performers)
}

interface VideoBaseData {
  id: string
  title: string
  description: string | null
  video_url: string
  thumbnail_url: string | null
  duration_seconds: number | null
  created_at: string
  recorded: string | null
  updated_at: string
}

function buildVideoWithMetadata(
  video: VideoBaseData,
  categoriesData: Array<{ video_id: string; categories: Category }> | null,
  curriculumsData: Array<{ video_id: string; curriculums: Curriculum }> | null,
  performersData: Array<{ video_id: string; performers: Performer }> | null
): Video {
  return {
    ...video,
    views: 0,
    categories: getVideoCategoriesForVideo(video.id, categoriesData),
    curriculums: getVideoCurriculumsForVideo(video.id, curriculumsData),
    performers: getVideoPerformersForVideo(video.id, performersData),
  }
}

export default function VideoLibrary({
  favoritesOnly = false,
  maxCurriculumOrder,
  storagePrefix: customStoragePrefix,
  nextBeltName, // Destructure new prop
  userProfile, // Destructure userProfile
}: VideoLibraryProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const storagePrefix = customStoragePrefix || (favoritesOnly ? "favoritesLibrary" : "videoLibrary")

  const [urlState] = useState(() => {
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
  const [curriculums, setCurriculums] = useState<Curriculum[]>([])
  const [performers, setPerformers] = useState<Performer[]>([])
  const [recordedValues, setRecordedValues] = useState<string[]>([])
  const [view, setView] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") {
      const storageKey = `${storagePrefix}View`
      return (localStorage.getItem(storageKey) as "grid" | "list") || "grid"
    }
    return "grid"
  })

  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedCurriculums, setSelectedCurriculums] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState(urlState.search)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [filterMode, setFilterMode] = useState<"AND" | "OR">(urlState.mode)
  const [currentPage, setCurrentPage] = useState(urlState.page)

  const [itemsPerPage, setItemsPerPage] = useState(() => {
    if (typeof window !== "undefined") {
      const storageKey = `${storagePrefix}ItemsPerPage`
      return Number.parseInt(localStorage.getItem(storageKey) || "12") // Default to 12
    }
    return 12
  })

  const [paginatedVideos, setPaginatedVideos] = useState<Video[]>([])
  const [user, setUser] = useState<any>(null)
  const [userLoading, setUserLoading] = useState(true)

  const supabase = createClient()

  const filteredByLevel = useMemo(() => {
    if (!maxCurriculumOrder) return allVideos

    return allVideos.filter((video) => {
      if (video.curriculums.length === 0) return false

      return video.curriculums.some((curr) => curr.display_order <= maxCurriculumOrder)
    })
  }, [allVideos, maxCurriculumOrder])

  const processedData = useMemo(() => {
    // Use filtered videos if maxCurriculumOrder is set, otherwise use all videos
    const videosToProcess = maxCurriculumOrder ? filteredByLevel : allVideos

    if (!videosToProcess.length) return { categories: [], curriculums: [], performers: [], recordedValues: [] }

    const categoryMap = new Map<string, Category>()
    const curriculumMap = new Map<string, Curriculum>()
    const performerMap = new Map<string, Performer>()
    const recordedSet = new Set<string>()

    videosToProcess.forEach((video) => {
      video.categories?.forEach((category) => {
        if (category?.id && category?.name) {
          categoryMap.set(category.id, category)
        }
      })

      video.curriculums?.forEach((curriculum) => {
        if (curriculum?.id && curriculum?.name) {
          if (!maxCurriculumOrder || curriculum.display_order <= maxCurriculumOrder) {
            curriculumMap.set(curriculum.id, curriculum)
          }
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
      curriculums: Array.from(curriculumMap.values()).sort((a, b) => a.display_order - b.display_order),
      performers: Array.from(performerMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      recordedValues: Array.from(recordedSet),
    }
  }, [allVideos, filteredByLevel, maxCurriculumOrder])

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
        const [videosResult, favoritesResult, categoriesResult, curriculumsResult, performersResult] =
          await Promise.all([
            supabase
              .from("videos")
              .select(`
              id, title, description, video_url, thumbnail_url, duration_seconds, 
              created_at, recorded, updated_at
            `)
              .order("created_at", { ascending: false }),

            user
              ? supabase.from("user_favorites").select("video_id").eq("user_id", user.id)
              : Promise.resolve({ data: [], error: null }),

            supabase.from("video_categories").select(`
              video_id,
              categories(id, name, color, description)
            `),

            supabase.from("video_curriculums").select(`
              video_id,
              curriculums(id, name, color, display_order, description)
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

        const videosWithMetadata = (videosResult.data || []).map((video) =>
          buildVideoWithMetadata(
            video,
            categoriesResult.data,
            curriculumsResult.data,
            performersResult.data
          )
        )

        const videoIds = videosWithMetadata.map((video) => video.id)
        const viewCounts = await getBatchVideoViewCounts(videoIds)

        const videosWithViewCounts = videosWithMetadata.map((video) => ({
          ...video,
          views: viewCounts[video.id] || 0,
        }))

        recordCircuitBreakerSuccess()
        saveToCache(videosWithViewCounts)

        if (mounted) {
          setAllVideos(videosWithViewCounts)
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

  useEffect(() => {
    setCategories(processedData.categories)
    setCurriculums(processedData.curriculums)
    setPerformers(processedData.performers)
    setRecordedValues(processedData.recordedValues)

    const hasFiltersToProcess =
      urlState.filters.length > 0 &&
      processedData.categories.length > 0 &&
      processedData.curriculums.length > 0

    if (hasFiltersToProcess) {
      const categoryIds = new Set(processedData.categories.map((c) => c.id))
      const curriculumIds = new Set(processedData.curriculums.map((c) => c.id))
      const { categories: separatedCategories, curriculums: separatedCurriculums } =
        separateUrlFilters(urlState.filters, categoryIds, curriculumIds)

      setSelectedCategories(separatedCategories)
      setSelectedCurriculums(separatedCurriculums)
    }
  }, [processedData])

  const [sortBy, setSortBy] = useState<VideoLibrarySortBy>(() => {
    if (typeof window !== "undefined") {
      const storageKey = `${storagePrefix}SortBy`
      return (localStorage.getItem(storageKey) as VideoLibrarySortBy) || "created_at"
    }
    return "created_at"
  })

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() => {
    if (typeof window !== "undefined") {
      const storageKey = `${storagePrefix}SortOrder`
      return (localStorage.getItem(storageKey) as "asc" | "desc") || "asc"
    }
    return "asc"
  })

  const processedVideos = useMemo(() => {
    let result = maxCurriculumOrder ? [...filteredByLevel] : [...allVideos]

    if (favoritesOnly) {
      result = result.filter((video) => userFavorites.has(video.id))
    }

    if (debouncedSearchQuery) {
      result = result.filter((video) => videoMatchesSearch(video, debouncedSearchQuery))
    }

    if (selectedCategories.length > 0 || selectedCurriculums.length > 0) {
      result = result.filter((video) =>
        videoMatchesFilters(video, selectedCategories, selectedCurriculums, filterMode)
      )
    }

    result.sort((a, b) => compareVideos(a, b, sortBy, sortOrder))

    return result
  }, [
    allVideos,
    debouncedSearchQuery,
    selectedCategories,
    selectedCurriculums,
    filterMode,
    sortBy,
    sortOrder,
    favoritesOnly,
    userFavorites,
    filteredByLevel,
    maxCurriculumOrder,
  ])

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

    const newURL = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname

    const currentSearch = window.location.search
    const newSearch = params.toString() ? `?${params.toString()}` : ""

    if (currentSearch !== newSearch) {
      router.replace(newURL, { scroll: false })
    }
  }

  const handleCurriculumToggle = (curriculumId: string) => {
    setSelectedCurriculums((prev) =>
      prev.includes(curriculumId) ? prev.filter((id) => id !== curriculumId) : [...prev, curriculumId],
    )
    setCurrentPage(1) // Reset to page 1 when filters change
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
    setSortBy(newSortBy as VideoLibrarySortBy)
    setSortOrder(newSortOrder)

    localStorage.setItem(`${storagePrefix}SortBy`, newSortBy)
    localStorage.setItem(`${storagePrefix}SortOrder`, newSortOrder)
  }

  const handleFilterModeChange = (newMode: "AND" | "OR") => {
    setFilterMode(newMode)
    const allFilters = [...selectedCategories, ...selectedCurriculums]

    reconstructURL(allFilters, searchQuery, newMode, 1) // Reset to page 1 when filter mode changes
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
    // Skip on initial mount - don't reconstruct URL if we're just loading from URL params
    if (searchQuery === urlState.search) {
      setDebouncedSearchQuery(searchQuery)
      return
    }

    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      // Reset to page 1 only when search actually changes
      reconstructURL(selectedCategories, searchQuery, filterMode, 1)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleFavoriteToggle = (videoId: string, isFavorited: boolean) => {
    setUserFavorites((prev) => {
      const newFavorites = new Set(prev)
      if (isFavorited) {
        newFavorites.add(videoId)
      } else {
        newFavorites.delete(videoId)
      }
      return newFavorites
    })
  }

  // Early returns for loading and empty states
  if (loading || userLoading) {
    return <LoadingState favoritesOnly={favoritesOnly} />
  }

  const hasNoFiltersApplied = !debouncedSearchQuery && selectedCategories.length === 0 && selectedCurriculums.length === 0
  if (videos.length === 0 && hasNoFiltersApplied && favoritesOnly) {
    return <EmptyFavoritesState />
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8">
      {maxCurriculumOrder && <MobileTrainingBanner nextBeltName={nextBeltName} />}
      <div className="mb-3 sm:mb-4 space-y-2 sm:space-y-3">
        <div className="space-y-2 sm:space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {maxCurriculumOrder && <DesktopTrainingBanner nextBeltName={nextBeltName} />}
            <div className="relative flex-1 max-w-md w-full">
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
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <ViewToggle view={view} onViewChange={handleViewChange} />
              <div className="hidden sm:block">
                <SortControl sortBy={sortBy} sortOrder={sortOrder} onSortChange={handleSortChange} />
              </div>
            </div>
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
                    {(selectedCategories.length > 0 || selectedCurriculums.length > 0) && (
                      <span className="ml-2 bg-red-600 text-white text-xs rounded-full px-2 py-0.5">
                        {selectedCategories.length + selectedCurriculums.length}
                      </span>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-sm max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-white">Filter Videos</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <FilterSection
                      categories={categories}
                      recordedValues={recordedValues}
                      performers={performers}
                      selectedCategories={selectedCategories}
                      onCategoryToggle={handleCategoryToggle}
                      videoCount={videos.length}
                      curriculums={curriculums}
                      selectedCurriculums={selectedCurriculums}
                      onCurriculumToggle={handleCurriculumToggle}
                    />
                    {selectedCategories.length + selectedCurriculums.length > 1 && (
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
              <div className="flex-1 sm:hidden">
                <SortControl sortBy={sortBy} sortOrder={sortOrder} onSortChange={handleSortChange} />
              </div>
            </div>
          </div>
        </div>
        <div className="hidden lg:block">
          <FilterSection
            categories={categories}
            recordedValues={recordedValues}
            performers={performers}
            selectedCategories={selectedCategories}
            onCategoryToggle={handleCategoryToggle}
            videoCount={videos.length}
            curriculums={curriculums}
            selectedCurriculums={selectedCurriculums}
            onCurriculumToggle={handleCurriculumToggle}
          />
          {selectedCategories.length + selectedCurriculums.length > 1 && (
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
                  ? "Videos must have ALL selected categories/curriculums"
                  : "Videos can have ANY selected categories/curriculums"}
              </span>
            </div>
          )}
        </div>
        {videos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              {favoritesOnly ? "No favorites found matching your criteria." : "No videos found matching your criteria."}
            </p>
          </div>
        ) : (
          <>
            <PaginationControls
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              handleItemsPerPageChange={handleItemsPerPageChange}
              currentPage={currentPage}
              handlePageChange={handlePageChange}
            />
            {view === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedVideos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    isFavorited={userFavorites.has(video.id)}
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {paginatedVideos.map((video) => (
                  <VideoCardList
                    key={video.id}
                    video={video}
                    isFavorited={userFavorites.has(video.id)}
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                ))}
              </div>
            )}
            <PaginationControls
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              handleItemsPerPageChange={handleItemsPerPageChange}
              currentPage={currentPage}
              handlePageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </div>
  )
}
