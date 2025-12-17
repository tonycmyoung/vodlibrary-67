import { describe, it, expect, vi, beforeEach } from "vitest"
import { deduplicateRequest, clearRequestCache } from "@/lib/request-cache"

describe("request-cache", () => {
  beforeEach(() => {
    clearRequestCache()
  })

  it("should execute request and return result", async () => {
    const requestFn = vi.fn().mockResolvedValue("result")

    const result = await deduplicateRequest("key1", requestFn)

    expect(result).toBe("result")
    expect(requestFn).toHaveBeenCalledTimes(1)
  })

  it("should deduplicate concurrent requests with same key", async () => {
    const requestFn = vi.fn().mockResolvedValue("result")

    const promise1 = deduplicateRequest("key1", requestFn)
    const promise2 = deduplicateRequest("key1", requestFn)
    const promise3 = deduplicateRequest("key1", requestFn)

    const results = await Promise.all([promise1, promise2, promise3])

    expect(results).toEqual(["result", "result", "result"])
    expect(requestFn).toHaveBeenCalledTimes(1)
  })

  it("should allow new request after previous completes", async () => {
    const requestFn = vi.fn().mockResolvedValue("result")

    await deduplicateRequest("key1", requestFn)
    await deduplicateRequest("key1", requestFn)

    expect(requestFn).toHaveBeenCalledTimes(2)
  })

  it("should handle different keys independently", async () => {
    const requestFn1 = vi.fn().mockResolvedValue("result1")
    const requestFn2 = vi.fn().mockResolvedValue("result2")

    const [result1, result2] = await Promise.all([
      deduplicateRequest("key1", requestFn1),
      deduplicateRequest("key2", requestFn2),
    ])

    expect(result1).toBe("result1")
    expect(result2).toBe("result2")
    expect(requestFn1).toHaveBeenCalledTimes(1)
    expect(requestFn2).toHaveBeenCalledTimes(1)
  })

  it("should clear cache entry after request completes", async () => {
    const requestFn = vi.fn().mockResolvedValue("result")

    await deduplicateRequest("key1", requestFn)
    await deduplicateRequest("key1", requestFn)

    expect(requestFn).toHaveBeenCalledTimes(2)
  })

  it("should handle request failures", async () => {
    const requestFn = vi.fn().mockRejectedValue(new Error("Request failed"))

    await expect(deduplicateRequest("key1", requestFn)).rejects.toThrow("Request failed")
    expect(requestFn).toHaveBeenCalledTimes(1)
  })

  it("should clear cache entry after request fails", async () => {
    const requestFn = vi.fn().mockRejectedValue(new Error("Request failed"))

    await expect(deduplicateRequest("key1", requestFn)).rejects.toThrow("Request failed")
    requestFn.mockResolvedValue("result")
    const result = await deduplicateRequest("key1", requestFn)

    expect(result).toBe("result")
    expect(requestFn).toHaveBeenCalledTimes(2)
  })

  it("should clear specific cache key", async () => {
    const requestFn = vi.fn().mockResolvedValue("result")

    const promise = deduplicateRequest("key1", requestFn)
    clearRequestCache("key1")

    await promise
    await deduplicateRequest("key1", requestFn)

    expect(requestFn).toHaveBeenCalledTimes(2)
  })

  it("should clear all cache keys", async () => {
    const requestFn1 = vi.fn().mockResolvedValue("result1")
    const requestFn2 = vi.fn().mockResolvedValue("result2")

    await Promise.all([deduplicateRequest("key1", requestFn1), deduplicateRequest("key2", requestFn2)])

    clearRequestCache()

    await Promise.all([deduplicateRequest("key1", requestFn1), deduplicateRequest("key2", requestFn2)])

    expect(requestFn1).toHaveBeenCalledTimes(2)
    expect(requestFn2).toHaveBeenCalledTimes(2)
  })
})
