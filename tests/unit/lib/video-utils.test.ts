import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  isGoogleDriveUrl,
  extractGoogleDriveId,
  getGoogleDriveThumbnail,
  extractVideoMetadata,
  formatDuration,
} from "../../../lib/video-utils"

describe("video-utils", () => {
  describe("isGoogleDriveUrl", () => {
    it("should return true for drive.google.com URLs", () => {
      expect(isGoogleDriveUrl("https://drive.google.com/file/d/123/view")).toBe(true)
    })

    it("should return true for docs.google.com URLs", () => {
      expect(isGoogleDriveUrl("https://docs.google.com/file/d/123/preview")).toBe(true)
    })

    it("should return false for non-Google Drive URLs", () => {
      expect(isGoogleDriveUrl("https://youtube.com/watch?v=123")).toBe(false)
      expect(isGoogleDriveUrl("https://vimeo.com/123")).toBe(false)
    })
  })

  describe("extractGoogleDriveId", () => {
    it("should extract file ID from Google Drive URL", () => {
      const url = "https://drive.google.com/file/d/1abc-XYZ_123/view"
      expect(extractGoogleDriveId(url)).toBe("1abc-XYZ_123")
    })

    it("should return null for URLs without file ID", () => {
      expect(extractGoogleDriveId("https://drive.google.com")).toBeNull()
      expect(extractGoogleDriveId("https://example.com")).toBeNull()
    })

    it("should handle various Google Drive URL formats", () => {
      expect(extractGoogleDriveId("https://drive.google.com/d/abc123/edit")).toBe("abc123")
      expect(extractGoogleDriveId("https://docs.google.com/file/d/xyz789/preview")).toBe("xyz789")
    })
  })

  describe("getGoogleDriveThumbnail", () => {
    it("should generate thumbnail URL from Google Drive URL", () => {
      const url = "https://drive.google.com/file/d/abc123/view"
      const thumbnail = getGoogleDriveThumbnail(url)
      expect(thumbnail).toBe("https://drive.google.com/thumbnail?id=abc123&sz=w400-h300")
    })

    it("should return null for URLs without file ID", () => {
      expect(getGoogleDriveThumbnail("https://drive.google.com")).toBeNull()
    })
  })

  describe("formatDuration", () => {
    it("should format seconds as MM:SS", () => {
      expect(formatDuration(45)).toBe("0:45")
      expect(formatDuration(125)).toBe("2:05")
    })

    it("should format hours as H:MM:SS", () => {
      expect(formatDuration(3665)).toBe("1:01:05")
      expect(formatDuration(7200)).toBe("2:00:00")
    })

    it("should pad minutes and seconds with leading zeros", () => {
      expect(formatDuration(305)).toBe("5:05")
      expect(formatDuration(3605)).toBe("1:00:05")
    })

    it("should handle zero duration", () => {
      expect(formatDuration(0)).toBe("0:00")
    })
  })

  describe("extractVideoMetadata", () => {
    beforeEach(() => {
      // Mock document.createElement for video element
      global.document = {
        createElement: vi.fn((tag: string) => {
          if (tag === "video") {
            const listeners: { [key: string]: Function[] } = {}
            const video = {
              crossOrigin: "",
              preload: "",
              src: "",
              currentTime: 0,
              duration: 120,
              videoWidth: 640,
              videoHeight: 480,
              addEventListener: vi.fn((event: string, callback: Function, options?: any) => {
                if (!listeners[event]) listeners[event] = []
                listeners[event].push(callback)

                // Trigger loadedmetadata immediately
                if (event === "loadedmetadata") {
                  setTimeout(() => callback(), 0)
                }
                // Trigger seeked event after loadedmetadata
                if (event === "seeked") {
                  setTimeout(() => callback(), 10)
                }
              }),
              removeEventListener: vi.fn((event: string, callback: Function) => {
                if (listeners[event]) {
                  listeners[event] = listeners[event].filter((cb) => cb !== callback)
                }
              }),
              load: vi.fn(),
            }
            return video
          }
          if (tag === "canvas") {
            return {
              width: 0,
              height: 0,
              getContext: vi.fn(() => ({
                drawImage: vi.fn(),
              })),
              toDataURL: vi.fn(() => "data:image/jpeg;base64,mockdata"),
            }
          }
          return {}
        }),
      } as any
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("should return thumbnail for Google Drive URLs", async () => {
      const metadata = await extractVideoMetadata("https://drive.google.com/file/d/abc123/view")

      expect(metadata.thumbnail).toBe("https://drive.google.com/thumbnail?id=abc123&sz=w400-h300")
      expect(metadata.duration).toBeUndefined()
    })

    it("should return empty metadata for Google Drive URLs without file ID", async () => {
      const metadata = await extractVideoMetadata("https://drive.google.com")

      expect(metadata.thumbnail).toBeUndefined()
      expect(metadata.duration).toBeUndefined()
    })

    it("should attempt to extract metadata from direct video URLs", async () => {
      const metadata = await extractVideoMetadata("https://example.com/video.mp4")

      // Verify the function completes and returns metadata
      expect(metadata).toBeDefined()
      expect(metadata.duration).toBe(120)
    })
  })
})
