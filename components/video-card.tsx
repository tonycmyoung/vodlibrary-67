"use client"

import type React from "react"
import { useState, useEffect, memo } from "react"
import { Card, CardContent } from "@/components/ui/card"
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

interface VideoCardProps {
  video: Video
  isFavorited?: boolean
}

const VideoCard = memo(function VideoCard({ video, isFavorited: initialIsFavorited = false }: VideoCardProps) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited)
  const [isLoading, setIsLoading] = useState(false)
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
  }, [video.id])

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
    setIsLoading(true)

    try {
      if (!user) return

      const supabase = createClient()
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

  const handleVideoClick = async (e: React.MouseEvent) => {
    console.log("[v0] Video card clicked:", video.id, video.title)
    console.log("[v0] Navigating to:", `/video/${video.id}`)
    console.log("[v0] Click event details:", {
      target: e.target,
      currentTarget: e.currentTarget,
      defaultPrevented: e.defaultPrevented,
      propagationStopped: e.isPropagationStopped?.(),
    })
  }

  return (
    <Link href={`/video/${video.id}`} onClick={handleVideoClick}>
      <Card className="group cursor-pointer bg-black/60 border-gray-800 hover:border-red-500/50 transition-all duration-300 hover:scale-105 overflow-hidden">
        <div className="relative h-48 bg-gray-900">
          {video.thumbnail_url ? (
            <img
              src={video.thumbnail_url || "/placeholder.svg"}
              alt={video.title}
              className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = "/placeholder.svg"
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-900 to-orange-900 flex items-center justify-center">
              <Play className="w-12 h-12 text-white/70" />
            </div>
          )}

          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
              <Play className="w-6 h-6 text-white ml-1" />
            </div>
          </div>

          {video.duration_seconds && (
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{formatDuration(video.duration_seconds)}</span>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 w-8 h-8 p-0 bg-black/60 hover:bg-black/80"
            onClick={toggleFavorite}
            disabled={isLoading}
          >
            <Heart className={`w-4 h-4 ${isFavorited ? "fill-red-500 text-red-500" : "text-white"}`} />
          </Button>
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold text-white mb-2 line-clamp-2 group-hover:text-red-400 transition-colors">
            {video.title}
          </h3>

          {video.description && <p className="text-gray-400 text-sm mb-3 line-clamp-2">{video.description}</p>}

          <div className="flex flex-wrap gap-1 mb-2">
            {validCategories.map((category) => (
              <Badge
                key={category.id}
                variant="outline"
                className="text-xs border-gray-600 text-gray-300"
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
                <Badge key={performer.id} variant="outline" className="text-xs border-purple-600 text-purple-400">
                  {performer.name}
                </Badge>
              ))}
            {video.recorded && video.recorded !== "Unset" && (
              <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                {video.recorded}
              </Badge>
            )}
          </div>

          <div className="flex justify-end">
            <div className="text-xs text-gray-400 font-medium">{video.views || 0} views</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
})

export default VideoCard
