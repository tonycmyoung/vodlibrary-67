/**
 * VideoLibrarySkeleton - Loading skeleton for VideoLibrary component
 * Used as Suspense fallback for streaming and to improve perceived performance
 */
export default function VideoLibrarySkeleton() {
  return (
    <div className="container mx-auto px-4 py-4 sm:py-8">
      {/* Search and filter bar skeleton */}
      <div className="mb-3 sm:mb-4 space-y-2 sm:space-y-3">
        <div className="space-y-2 sm:space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-black/30" />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="h-10 w-24 animate-pulse rounded-lg bg-black/30" />
              <div className="h-10 w-24 animate-pulse rounded-lg bg-black/30" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="h-9 w-24 animate-pulse rounded-lg bg-black/30 lg:hidden" />
            </div>
          </div>
        </div>

        {/* Category filter skeleton - desktop */}
        <div className="hidden lg:block">
          <div className="mb-4 flex flex-wrap gap-2">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-8 w-20 animate-pulse rounded-full bg-black/30"
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        </div>

        {/* Video grid skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-lg bg-black/30"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Thumbnail skeleton */}
              <div className="aspect-video w-full animate-pulse bg-white/5" />
              {/* Content skeleton */}
              <div className="p-4">
                <div className="mb-2 h-5 w-3/4 animate-pulse rounded bg-white/10" />
                <div className="mb-3 h-4 w-1/2 animate-pulse rounded bg-white/5" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 animate-pulse rounded-full bg-white/10" />
                  <div className="h-5 w-12 animate-pulse rounded-full bg-white/10" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination skeleton */}
        <div className="flex flex-col gap-2 py-2 sm:gap-3 sm:py-3">
          <div className="flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-10 animate-pulse rounded bg-white/10" />
              <div className="h-10 w-20 animate-pulse rounded bg-black/30" />
              <div className="h-4 w-16 animate-pulse rounded bg-white/10" />
            </div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 w-8 animate-pulse rounded bg-black/30" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
