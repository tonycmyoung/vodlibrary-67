const requestCache = new Map<string, Promise<any>>()

export function deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
  // If request is already in progress, return the existing promise
  if (requestCache.has(key)) {
    return requestCache.get(key) as Promise<T>
  }

  // Start new request and cache the promise
  const promise = requestFn().finally(() => {
    // Remove from cache when request completes (success or failure)
    requestCache.delete(key)
  })

  requestCache.set(key, promise)
  return promise
}

export function clearRequestCache(key?: string) {
  if (key) {
    requestCache.delete(key)
  } else {
    requestCache.clear()
  }
}
