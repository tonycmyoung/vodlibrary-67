export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-orange-900">
      {/* Header skeleton */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-32 animate-pulse rounded bg-white/10" />
          </div>
          <div className="hidden md:flex items-center gap-6">
            <div className="h-4 w-16 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-16 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-16 animate-pulse rounded bg-white/10" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
          </div>
        </div>
      </header>

      {/* Main content skeleton */}
      <main className="container mx-auto px-4 py-8">
        {/* Search and filter bar skeleton */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-black/30" />
          <div className="flex items-center gap-2">
            <div className="h-10 w-24 animate-pulse rounded-lg bg-black/30" />
            <div className="h-10 w-24 animate-pulse rounded-lg bg-black/30" />
          </div>
        </div>

        {/* Category filter skeleton */}
        <div className="mb-6 flex flex-wrap gap-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-8 w-20 animate-pulse rounded-full bg-black/30"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>

        {/* Video grid skeleton */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
      </main>
    </div>
  )
}
