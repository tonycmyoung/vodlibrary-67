"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, Clock, Heart } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface Video {
  id: string
  title: string
  description: string | null
  video_url: string
  thumbnail_url: string | null
  duration_seconds: number | null
  created_at: string
  recorded: string | null
  views: number | null
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

interface VideoCardListProps {
  video: Video
  isFavorited?: boolean
  onFavoriteToggle?: (videoId: string, isFavorited: boolean) => void
}

export default function VideoCardList({
  video,
  isFavorited: initialIsFavorited = false,
  onFavoriteToggle,
}: VideoCardListProps) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user: userData },
        } = await supabase.auth.getUser()
        setUser(userData)
      } catch (error) {
        console.error("Error getting user:", error)
      }
    }
    getUser()
  }, [])

  useEffect(() => {
    setIsFavorited(initialIsFavorited)
  }, [initialIsFavorited])

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "Unknown"
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      if (!user) {
        return
      }

      const supabase = createClient()

      if (isFavorited) {
        await supabase.from("user_favorites").delete().eq("user_id", user.id).eq("video_id", video.id)

        setIsFavorited(false)
        onFavoriteToggle?.(video.id, false)
      } else {
        await supabase.from("user_favorites").insert({
          user_id: user.id,
          video_id: video.id,
        })

        setIsFavorited(true)
        onFavoriteToggle?.(video.id, true)
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
    }
  }

  const validCategories = (video.categories || []).filter((category) => category && category.id && category.name)

  return (
    <Link href={`/video/${video.id}`}>
      <div className="group cursor-pointer bg-gray-900/50 border border-gray-800 hover:border-red-500/50 transition-all duration-200 hover:bg-gray-900/70 rounded-lg p-4 flex">
        <div className="flex items-center gap-2 flex-1">
          {/* Small thumbnail */}
          <div className="relative w-16 h-12 bg-gray-900 rounded overflow-hidden flex-shrink-0">
            {video.thumbnail_url ? (
              <img
                src={video.thumbnail_url || "/placeholder.svg"}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-red-900 to-orange-900 flex items-center justify-center">
                <Play className="w-4 h-4 text-white/70" />
              </div>
            )}

            {/* Duration badge */}
            {video.duration_seconds && (
              <div className="absolute bottom-0 right-0 bg-black/80 text-white text-xs px-1 py-0.5 rounded-tl flex items-center">
                <Clock className="w-2 h-2 mr-1" />
                <span>{formatDuration(video.duration_seconds)}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-white text-sm line-clamp-1 group-hover:text-red-400 transition-colors mb-1">
              {video.title}
            </h3>

            {video.description && <p className="text-gray-400 text-xs line-clamp-1 mb-2">{video.description}</p>}

            <div className="flex flex-wrap gap-1">
              {validCategories.map((category) => (
                <Badge
                  key={category.id}
                  variant="outline"
                  className="text-xs px-1 py-0 h-4 border-gray-600 text-gray-300"
                  style={{
                    borderColor: (category?.color || "#6b7280") + "60",
                    color: category?.color || "#9ca3af",
                  }}
                >
                  {category?.name || "Uncategorized"}
                </Badge>
              ))}
              {video.performers &&
                video.performers.length > 0 &&
                video.performers.map((performer) => (
                  <Badge
                    key={performer.id}
                    variant="outline"
                    className="text-xs px-1 py-0 h-4 border-purple-600 text-purple-400"
                  >
                    {performer.name}
                  </Badge>
                ))}
              {/* Recorded field display after performers */}
              {video.recorded && video.recorded !== "Unset" && (
                <Badge variant="outline" className="text-xs px-1 py-0 h-4 border-gray-600 text-gray-400">
                  {video.recorded}
                </Badge>
              )}
            </div>
          </div>

          {/* Favorite button and view count */}
          <div className="flex flex-col items-end space-y-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0 bg-black/60 hover:bg-black/80"
              onClick={toggleFavorite}
              data-no-loading // prevent global loading spinner on favorite toggle
            >
              <Heart className={`w-4 h-4 ${isFavorited ? "fill-red-500 text-red-500" : "text-white"}`} />
            </Button>
            <div className="text-xs text-gray-400 font-medium">{video.views || 0} views</div>
          </div>
        </div>
      </div>
    </Link>
  )
}
