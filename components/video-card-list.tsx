"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, Clock, Heart } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"

interface Video {
  id: string
  title: string
  description: string | null
  video_url: string
  thumbnail_url: string | null
  duration_seconds: number | null
  created_at: string
  recorded: string | null
  categories: Array<{
    id: string
    name: string
    color: string
  }>
}

interface VideoCardListProps {
  video: Video
}

export default function VideoCardList({ video }: VideoCardListProps) {
  const [isFavorited, setIsFavorited] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!video || !video.id) {
      return
    }
    checkIfFavorited()
  }, [video])

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
      setIsFavorited(false)
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "Unknown"
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
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

  const validCategories = (video.categories || []).filter((category) => category && category.id && category.name)

  return (
    <Link href={`/video/${video.id}`}>
      <div className="group cursor-pointer bg-gray-900/50 border border-gray-800 hover:border-red-500/50 transition-all duration-200 hover:bg-gray-900/70 rounded-lg p-4">
        <div className="flex items-center gap-2">
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
              {/* Recorded field display after categories */}
              {video.recorded && video.recorded !== "Unset" && (
                <Badge variant="outline" className="text-xs px-1 py-0 h-4 border-gray-600 text-gray-400">
                  {video.recorded}
                </Badge>
              )}
            </div>
          </div>

          {/* Favorite button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0 bg-black/60 hover:bg-black/80 flex-shrink-0"
            onClick={toggleFavorite}
            disabled={isLoading}
          >
            <Heart className={`w-4 h-4 ${isFavorited ? "fill-red-500 text-red-500" : "text-white"}`} />
          </Button>
        </div>
      </div>
    </Link>
  )
}
