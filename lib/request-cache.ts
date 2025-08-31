type RequestKey = string
type RequestPromise<T> = Promise<T>

const requestCache = new Map<RequestKey, RequestPromise<any>>()

export function deduplicateRequest<T>(key: RequestKey, requestFn: () => Promise<T>): Promise<T> {
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

export function clearRequestCache(key?: RequestKey) {
  if (key) {
    requestCache.delete(key)
  } else {
    requestCache.clear()
  }
}
