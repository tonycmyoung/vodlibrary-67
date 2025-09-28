"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Heart, Calendar, User } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { incrementVideoViews } from "@/lib/actions"
import { formatShortDate } from "@/lib/utils/date"
import { useIsMobile } from "@/hooks/use-mobile"

interface VideoPlayerProps {
  video: {
    id: string
    title: string
    description: string | null
    video_url: string
    duration_seconds: number | null
    created_at: string
    recorded: string | null
    isFavorited?: boolean
    views?: number
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
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const [isFavorited, setIsFavorited] = useState(video.isFavorited || false)
  const [isLoading, setIsLoading] = useState(false)
  const [viewCount, setViewCount] = useState(video.views || 0)
  const isMobile = useIsMobile()
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const isAdminView = searchParams.get("admin-view") === "student"

  useEffect(() => {
    const incrementViews = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      console.log("[v0] Client-side user check:", user?.id || "no user")
      await incrementVideoViews(video.id)
      setViewCount((prev) => prev + 1)
    }
    incrementViews()
  }, [video.id])

  const toggleFavorite = async () => {
    setIsLoading(true)

    try {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      if (isFavorited) {
        await supabase.from("user_favorites").delete().eq("user_id", user.id).eq("video_id", video.id)
        setIsFavorited(false)
      } else {
        await supabase.from("user_favorites").insert({
          user_id: user.id,
          video_id: video.id,
        })
        setIsFavorited(true)
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "Unknown duration"
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const getEmbeddableVideoUrl = (url: string) => {
    // Handle Google Drive URLs
    if (url.includes("drive.google.com")) {
      // Extract file ID from various Google Drive URL formats
      let fileId = ""

      // Format: https://drive.google.com/file/d/FILE_ID/view
      const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/)
      if (fileMatch) {
        fileId = fileMatch[1]
      }

      // Format: https://drive.google.com/open?id=FILE_ID
      const openMatch = url.match(/[?&]id=([a-zA-Z0-9-_]+)/)
      if (openMatch) {
        fileId = openMatch[1]
      }

      if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview?rm=minimal&embedded=true`
      }
    }

    // For direct video URLs or other formats, return as-is
    return url
  }

  const handleIframeClick = () => {}

  const handleIframeLoad = () => {
    setIframeLoaded(true)
  }

  const handleBackClick = () => {
    router.back()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          className="text-gray-300 hover:text-gray-800 hover:bg-gray-100"
          onClick={handleBackClick}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Library
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Video Player */}
        <div className="lg:col-span-2">
          <Card className="bg-black/60 border-gray-800 overflow-hidden">
            <div className="aspect-video bg-gray-900 relative">
              {video.video_url ? (
                <>
                  <iframe
                    src={getEmbeddableVideoUrl(video.video_url)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    title={video.title}
                    sandbox="allow-scripts allow-same-origin allow-presentation"
                    allowFullScreen
                    onLoad={handleIframeLoad}
                  />
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-red-900 to-orange-900 flex items-center justify-center">
                  <div className="text-center text-white">
                    <p className="text-lg mb-2">No Video Available</p>
                    <p className="text-sm text-gray-300">Please contact an administrator to add a video URL</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Video Info */}
        <div className="space-y-6">
          <Card className="bg-black/60 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-2xl font-bold text-white pr-4">{video.title}</h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFavorite}
                  disabled={isLoading}
                  className="flex-shrink-0"
                  data-no-loading // prevent global loading spinner on favorite toggle
                >
                  <Heart className={`w-5 h-5 ${isFavorited ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
                </Button>
              </div>

              {video.description && (
                <p className="text-gray-300 mb-4 leading-relaxed whitespace-pre-wrap">{video.description}</p>
              )}

              <div className="space-y-3">
                <div className="flex items-center text-gray-400 text-sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Added {formatShortDate(video.created_at)}</span>
                </div>

                {video.recorded && video.recorded !== "Unset" && (
                  <div className="flex items-center text-gray-400 text-sm">
                    <span>Recorded {video.recorded}</span>
                  </div>
                )}

                {video.performers && video.performers.length > 0 && (
                  <div className="flex items-center text-gray-400 text-sm">
                    <User className="w-4 h-4 mr-2" />
                    <span>{video.performers.map((p) => p.name).join(", ")}</span>
                  </div>
                )}

                <div className="text-xs text-gray-400 font-medium">{viewCount} views</div>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {video.categories.map((category) => (
                    <Badge
                      key={category.id}
                      variant="outline"
                      className="border-gray-600 text-gray-300"
                      style={{ borderColor: category.color + "60", color: category.color }}
                    >
                      {category.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legal Notice */}
          <div className="p-4 bg-gray-800/30 border border-gray-600/30 rounded-lg">
            <p className="text-gray-400 text-sm text-center italic">
              Videos are for personal study only. Downloading, distributing, or sharing this material without
              authorization is strictly prohibited.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
