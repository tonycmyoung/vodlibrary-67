"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Heart, Clock, Calendar } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { useSearchParams } from "next/navigation"

interface VideoPlayerProps {
  video: {
    id: string
    title: string
    description: string | null
    video_url: string
    duration_seconds: number | null
    created_at: string
    recorded: string | null
    categories: Array<{
      id: string
      name: string
      color: string
    }>
  }
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const [isFavorited, setIsFavorited] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()
  const isAdminView = searchParams.get("admin-view") === "student"

  useEffect(() => {
    checkIfFavorited()
  }, [video.id])

  const checkIfFavorited = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data } = await supabase
        .from("user_favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("video_id", video.id)
        .single()

      setIsFavorited(!!data)
    } catch (error) {
      console.error("Error checking favorite status:", error)
    }
  }

  const toggleFavorite = async () => {
    setIsLoading(true)

    try {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button */}
      <div className="mb-6">
        <Link href={isAdminView ? "/?admin-view=student" : "/"}>
          <Button variant="ghost" className="text-gray-300 hover:text-gray-800 hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Library
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Video Player */}
        <div className="lg:col-span-2">
          <Card className="bg-black/60 border-gray-800 overflow-hidden">
            <div className="aspect-video bg-gray-900">
              {video.video_url ? (
                <iframe
                  src={getEmbeddableVideoUrl(video.video_url)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  title={video.title}
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                  allowFullScreen
                />
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
                >
                  <Heart className={`w-5 h-5 ${isFavorited ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
                </Button>
              </div>

              {video.description && <p className="text-gray-300 mb-4 leading-relaxed">{video.description}</p>}

              <div className="space-y-3">
                <div className="flex items-center text-gray-400 text-sm">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>{formatDuration(video.duration_seconds)}</span>
                </div>

                <div className="flex items-center text-gray-400 text-sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Added {formatDate(video.created_at)}</span>
                </div>

                {video.recorded && video.recorded !== "Unset" && (
                  <div className="flex items-center text-gray-400 text-sm">
                    {/* Video icon is removed to avoid redeclaration */}
                    <span>Recorded {video.recorded}</span>
                  </div>
                )}
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
        </div>
      </div>
    </div>
  )
}
