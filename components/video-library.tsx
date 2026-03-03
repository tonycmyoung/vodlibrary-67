"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import { useVideoLibraryUrl } from "@/hooks/use-video-library-url"
import { createClient } from "@/lib/supabase/client"
import VideoCard from "@/components/video-card"
import VideoCardList from "@/components/video-card-list"
import ViewToggle from "@/components/view-toggle"
import SortControl from "@/components/sort-control"
import SearchInput from "@/components/search-input"
import PaginationControls from "@/components/pagination-controls"
import FilterSection from "@/components/filter-section"
import FilterModeToggle from "@/components/filter-mode-toggle"
import { MobileTrainingBanner, DesktopTrainingBanner } from "@/components/training-banner"
import { Button } from "@/components/ui/button"
import { Loader2, Heart, Filter } from "lucide-react"
import { getBatchVideoViewCounts } from "@/lib/actions/videos"
import type { Video, Category, Curriculum, Performer, FilterMode } from "@/types/video"

// Lazy load MobileFilterDialog to reduce initial bundle size
// The dialog content is only needed when user clicks "Filters" button on mobile
const MobileFilterDialog = dynamic(() => import("@/components/mobile-filter-dialog"), {
  ssr: false,
  loading: () => (
    <Button
      variant="outline"
      size="sm"
      className="lg:hidden bg-black/50 border-gray-700 text-white"
      disabled
    >
      <Filter className="h-4 w-4 mr-2" />
      Filters
    </Button>
  ),
})
import {
  compareVideos,
  videoMatchesSearch,
  videoMatchesFilters,
  type VideoLibrarySortBy,
} from "@/lib/video-sorting"

interface VideoLibraryProps {
  favoritesOnly?: boolean
  maxCurriculumOrder?: number // Added optional curriculum filtering for My Level page
  storagePrefix?: string // Allow custom storage prefix for separate UI state
  nextBeltName?: string // Add prop for next belt name
  userProfile?: any // Added prop for user profile
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

// No videos state component - extracted to reduce cognitive complexity
const NoVideosState = ({ favoritesOnly }: { favoritesOnly: boolean }) => (
  <div className="text-center py-12">
    <p className="text-gray-400 text-lg">
      {favoritesOnly ? "No favorites found matching your criteria." : "No videos found matching your criteria."}
    </p>
  </div>
)

// Desktop filter section component - extracted to reduce cognitive complexity
const DesktopFilterSection = ({
  categories,
  recordedValues,
  performers,
  selectedCategories,
  onCategoryToggle,
  videoCount,
  curriculums,
  selectedCurriculums,
  onCurriculumToggle,
  filterMode,
  onFilterModeChange,
}: {
  categories: Category[]
  recordedValues: string[]
  performers: Performer[]
  selectedCategories: string[]
  onCategoryToggle: (id: string) => void
  videoCount: number
  curriculums: Curriculum[]
  selectedCurriculums: string[]
  onCurriculumToggle: (id: string) => void
  filterMode: FilterMode
  onFilterModeChange: (mode: FilterMode) => void
}) => (
  <div className="hidden lg:block">
    <FilterSection
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
    {selectedCategories.length + selectedCurriculums.length > 1 && (
      <FilterModeToggle filterMode={filterMode} onFilterModeChange={onFilterModeChange} showDescription />
    )}
  </div>
)

// Video content section - extracted to reduce cognitive complexity
const VideoContentSection = ({
  videos,
  paginatedVideos,
  totalPages,
  itemsPerPage,
  onItemsPerPageChange,
  currentPage,
  onPageChange,
  view,
  userFavorites,
  onFavoriteToggle,
  favoritesOnly,
}: {
  videos: Video[]
  paginatedVideos: Video[]
  totalPages: number
  itemsPerPage: number
  onItemsPerPageChange: (value: string) => void
  currentPage: number
  onPageChange: (page: number) => void
  view: "grid" | "list"
  userFavorites: Set<string>
  onFavoriteToggle: (videoId: string, isFavorited: boolean) => void
  favoritesOnly: boolean
}) => {
  if (videos.length === 0) {
    return <NoVideosState favoritesOnly={favoritesOnly} />
  }

  return (
    <>
      <PaginationControls
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={onItemsPerPageChange}
        currentPage={currentPage}
        onPageChange={onPageChange}
      />
      <VideoDisplay
        view={view}
        videos={paginatedVideos}
        userFavorites={userFavorites}
        onFavoriteToggle={onFavoriteToggle}
      />
      <PaginationControls
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={onItemsPerPageChange}
        currentPage={currentPage}
        onPageChange={onPageChange}
      />
    </>
  )
}

// Video grid/list display component - extracted to reduce cognitive complexity
const VideoDisplay = ({
  view,
  videos,
  userFavorites,
  onFavoriteToggle,
}: {
  view: "grid" | "list"
  videos: Video[]
  userFavorites: Set<string>
  onFavoriteToggle: (videoId: string, isFavorited: boolean) => void
}) => {
  if (view === "grid") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            isFavorited={userFavorites.has(video.id)}
            onFavoriteToggle={onFavoriteToggle}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {videos.map((video) => (
        <VideoCardList
          key={video.id}
          video={video}
          isFavorited={userFavorites.has(video.id)}
          onFavoriteToggle={onFavoriteToggle}
        />
      ))}
    </div>
  )
}

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

// Helper function to process video metadata into filter options - reduces cognitive complexity
function processVideoMetadata(
  videosToProcess: Video[],
  maxCurriculumOrder?: number
): {
  categories: Category[]
  curriculums: Curriculum[]
  performers: Performer[]
  recordedValues: string[]
} {
  if (!videosToProcess.length) {
    return { categories: [], curriculums: [], performers: [], recordedValues: [] }
  }

  const categoryMap = new Map<string, Category>()
  const curriculumMap = new Map<string, Curriculum>()
  const performerMap = new Map<string, Performer>()
  const recordedSet = new Set<string>()

  for (const video of videosToProcess) {
    collectCategoriesFromVideo(video, categoryMap)
    collectCurriculumsFromVideo(video, curriculumMap, maxCurriculumOrder)
    collectPerformersFromVideo(video, performerMap)
    collectRecordedFromVideo(video, recordedSet)
  }

  return {
    categories: Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    curriculums: Array.from(curriculumMap.values()).sort((a, b) => a.display_order - b.display_order),
    performers: Array.from(performerMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    recordedValues: Array.from(recordedSet),
  }
}

function collectCategoriesFromVideo(video: Video, categoryMap: Map<string, Category>) {
  video.categories?.forEach((category) => {
    if (category?.id && category?.name) {
      categoryMap.set(category.id, category)
    }
  })
}

function collectCurriculumsFromVideo(
  video: Video,
  curriculumMap: Map<string, Curriculum>,
  maxCurriculumOrder?: number
) {
  video.curriculums?.forEach((curriculum) => {
    if (!curriculum?.id || !curriculum?.name) return
    if (!maxCurriculumOrder || curriculum.display_order <= maxCurriculumOrder) {
      curriculumMap.set(curriculum.id, curriculum)
    }
  })
}

function collectPerformersFromVideo(video: Video, performerMap: Map<string, Performer>) {
  video.performers?.forEach((performer) => {
    if (performer?.id && performer?.name) {
      performerMap.set(performer.id, performer)
    }
  })
}

function collectRecordedFromVideo(video: Video, recordedSet: Set<string>) {
  if (video.recorded && video.recorded !== "Unset") {
    recordedSet.add(video.recorded)
  }
}

export default function VideoLibrary({
  favoritesOnly = false,
  maxCurriculumOrder,
  storagePrefix: customStoragePrefix,
  nextBeltName, // Destructure new prop
  userProfile, // Destructure userProfile
}: VideoLibraryProps) {
  const searchParams = useSearchParams()
  const storagePrefix = customStoragePrefix || (favoritesOnly ? "favoritesLibrary" : "videoLibrary")

  // Use the centralized URL state hook
  const { urlState, updateUrl } = useVideoLibraryUrl()

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
  const [filterMode, setFilterMode] = useState<FilterMode>(urlState.mode)
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
    const videosToProcess = maxCurriculumOrder ? filteredByLevel : allVideos
    return processVideoMetadata(videosToProcess, maxCurriculumOrder)
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

  // Handler for curriculum filter toggle - uses centralized URL hook
  const handleCurriculumToggle = useCallback((curriculumId: string) => {
    const newSelectedCurriculums = selectedCurriculums.includes(curriculumId)
      ? selectedCurriculums.filter((id) => id !== curriculumId)
      : [...selectedCurriculums, curriculumId]

    setSelectedCurriculums(newSelectedCurriculums)
    setCurrentPage(1)
    const allFilters = [...selectedCategories, ...newSelectedCurriculums]
    updateUrl({ filters: allFilters, page: 1 })
  }, [selectedCurriculums, selectedCategories, updateUrl])

  // Handler for category filter toggle - uses centralized URL hook
  const handleCategoryToggle = useCallback((categoryId: string) => {
    const newSelectedCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter((id) => id !== categoryId)
      : [...selectedCategories, categoryId]

    setSelectedCategories(newSelectedCategories)
    setCurrentPage(1)
    const allFilters = [...newSelectedCategories, ...selectedCurriculums]
    updateUrl({ filters: allFilters, page: 1 })
  }, [selectedCategories, selectedCurriculums, updateUrl])

  // Handler for view change - only updates localStorage, no URL
  const handleViewChange = useCallback((newView: "grid" | "list") => {
    setView(newView)
    const storageKey = `${storagePrefix}View`
    localStorage.setItem(storageKey, newView)
  }, [storagePrefix])

  // Handler for sort change - only updates localStorage, no URL
  const handleSortChange = useCallback((newSortBy: string, newSortOrder: "asc" | "desc") => {
    setSortBy(newSortBy as VideoLibrarySortBy)
    setSortOrder(newSortOrder)
    localStorage.setItem(`${storagePrefix}SortBy`, newSortBy)
    localStorage.setItem(`${storagePrefix}SortOrder`, newSortOrder)
  }, [storagePrefix])

  // Handler for filter mode change - uses centralized URL hook
  const handleFilterModeChange = useCallback((newMode: "AND" | "OR") => {
    setFilterMode(newMode)
    setCurrentPage(1)
    updateUrl({ mode: newMode, page: 1 })
  }, [updateUrl])

  // Handler for items per page change - uses centralized URL hook
  const handleItemsPerPageChange = useCallback((value: string) => {
    const newItemsPerPage = Number.parseInt(value, 10)
    setItemsPerPage(newItemsPerPage)
    localStorage.setItem(`${storagePrefix}ItemsPerPage`, value)
    setCurrentPage(1)
    updateUrl({ page: 1 })
  }, [storagePrefix, updateUrl])

  // Handler for page change - uses centralized URL hook
  const handlePageChange = useCallback((newPage: number) => {
    const boundedPage = Math.max(1, Math.min(newPage, totalPages || 1))
    setCurrentPage(boundedPage)
    updateUrl({ page: boundedPage })
  }, [totalPages, updateUrl])

  // Debounced search effect - uses centralized URL hook
  useEffect(() => {
    // Skip on initial mount - don't update URL if we're just loading from URL params
    if (searchQuery === urlState.search) {
      setDebouncedSearchQuery(searchQuery)
      return
    }

    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      // Reset to page 1 only when search actually changes
      setCurrentPage(1)
      updateUrl({ search: searchQuery, page: 1 })
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, urlState.search, updateUrl])

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

  const searchPlaceholder = favoritesOnly ? "Search favorites..." : "Search videos..."
  const clearSearch = () => setSearchQuery("")

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8">
      {maxCurriculumOrder && <MobileTrainingBanner nextBeltName={nextBeltName} />}
      <div className="mb-3 sm:mb-4 space-y-2 sm:space-y-3">
        <div className="space-y-2 sm:space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {maxCurriculumOrder && <DesktopTrainingBanner nextBeltName={nextBeltName} />}
<SearchInput
  value={searchQuery}
  onChange={setSearchQuery}
  onClear={clearSearch}
  placeholder={searchPlaceholder}
  />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <ViewToggle view={view} onViewChange={handleViewChange} />
              <div className="hidden sm:block">
                <SortControl sortBy={sortBy} sortOrder={sortOrder} onSortChange={handleSortChange} />
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <MobileFilterDialog
                showMobileFilters={showMobileFilters}
                setShowMobileFilters={setShowMobileFilters}
                categories={categories}
                recordedValues={recordedValues}
                performers={performers}
                selectedCategories={selectedCategories}
                onCategoryToggle={handleCategoryToggle}
                videoCount={videos.length}
                curriculums={curriculums}
                selectedCurriculums={selectedCurriculums}
                onCurriculumToggle={handleCurriculumToggle}
                filterMode={filterMode}
                onFilterModeChange={handleFilterModeChange}
              />
              <div className="flex-1 sm:hidden">
                <SortControl sortBy={sortBy} sortOrder={sortOrder} onSortChange={handleSortChange} />
              </div>
            </div>
          </div>
        </div>
        <DesktopFilterSection
          categories={categories}
          recordedValues={recordedValues}
          performers={performers}
          selectedCategories={selectedCategories}
          onCategoryToggle={handleCategoryToggle}
          videoCount={videos.length}
          curriculums={curriculums}
          selectedCurriculums={selectedCurriculums}
          onCurriculumToggle={handleCurriculumToggle}
          filterMode={filterMode}
          onFilterModeChange={handleFilterModeChange}
        />
<VideoContentSection
  videos={videos}
  paginatedVideos={paginatedVideos}
  totalPages={totalPages}
  itemsPerPage={itemsPerPage}
  onItemsPerPageChange={handleItemsPerPageChange}
  currentPage={currentPage}
  onPageChange={handlePageChange}
  view={view}
  userFavorites={userFavorites}
  onFavoriteToggle={handleFavoriteToggle}
          favoritesOnly={favoritesOnly}
        />
      </div>
    </div>
  )
}
