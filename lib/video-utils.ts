export interface VideoMetadata {
  duration?: number
  thumbnail?: string
  width?: number
  height?: number
}

export interface Curriculum {
  id: string
  name: string
  description: string | null
  color: string
  display_order: number
}

export function isGoogleDriveUrl(url: string): boolean {
  return url.includes("drive.google.com") || url.includes("docs.google.com")
}

export function extractGoogleDriveId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}

export function getGoogleDriveThumbnail(url: string): string | null {
  const fileId = extractGoogleDriveId(url)
  if (!fileId) return null

  // Google Drive thumbnail API
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400-h300`
}

export async function extractVideoMetadata(videoUrl: string): Promise<VideoMetadata> {
  return new Promise((resolve) => {
    // Handle Google Drive URLs
    if (isGoogleDriveUrl(videoUrl)) {
      const thumbnail = getGoogleDriveThumbnail(videoUrl)
      resolve({
        thumbnail: thumbnail || undefined,
        duration: undefined, // Cannot reliably get duration from Google Drive embeds
      })
      return
    }

    // Handle direct video URLs
    const video = document.createElement("video")
    video.crossOrigin = "anonymous"
    video.preload = "metadata"

    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata)
      video.removeEventListener("error", onError)
      video.src = ""
    }

    const onLoadedMetadata = () => {
      try {
        // Create canvas to capture first frame
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          cleanup()
          resolve({ duration: video.duration })
          return
        }

        canvas.width = video.videoWidth || 400
        canvas.height = video.videoHeight || 300

        // Seek to first frame and capture
        video.currentTime = 0.1 // Slightly after start to avoid black frame

        video.addEventListener(
          "seeked",
          () => {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            const thumbnail = canvas.toDataURL("image/jpeg", 0.8)

            cleanup()
            resolve({
              duration: video.duration,
              thumbnail,
              width: video.videoWidth,
              height: video.videoHeight,
            })
          },
          { once: true },
        )
      } catch (error) {
        console.error("[v0] Error capturing thumbnail:", error)
        cleanup()
        resolve({ duration: video.duration })
      }
    }

    const onError = () => {
      console.error("[v0] Error loading video for metadata extraction")
      cleanup()
      resolve({})
    }

    video.addEventListener("loadedmetadata", onLoadedMetadata)
    video.addEventListener("error", onError)

    // Set source and load
    video.src = videoUrl
    video.load()

    // Timeout after 10 seconds
    setTimeout(() => {
      cleanup()
      resolve({})
    }, 10000)
  })
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`
}
