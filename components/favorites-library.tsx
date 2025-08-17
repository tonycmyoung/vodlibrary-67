"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import VideoCard from "@/components/video-card"
import { Heart, Loader2 } from "lucide-react"

interface Video {
  id: string
  title: string
  description: string | null
  video_url: string
  thumbnail_url: string | null
  duration_seconds: number | null
  created_at: string
  categories: Array<{
    id: string
    name: string
    color: string
  }>
}

export default function FavoritesLibrary() {
  const [favoriteVideos, setFavoriteVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFavoriteVideos()
  }, [])

  const fetchFavoriteVideos = async () => {
    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from("user_favorites")
        .select(
          `
          videos!inner(
            *,
            video_categories(
              categories(id, name, color)
            )
          )
        `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching favorite videos:", error)
        return
      }

      // Transform the data to group categories per video
      const videosWithCategories = data?.reduce((acc: Video[], favorite: any) => {
        const video = favorite.videos
        const existingVideo = acc.find((v) => v.id === video.id)

        if (existingVideo) {
          existingVideo.categories.push(video.video_categories.categories)
        } else {
          acc.push({
            ...video,
            categories: video.video_categories ? [video.video_categories.categories] : [],
          })
        }

        return acc
      }, [])

      setFavoriteVideos(videosWithCategories || [])
    } catch (error) {
      console.error("Error fetching favorite videos:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        <span className="ml-2 text-gray-300">Loading your favorites...</span>
      </div>
    )
  }

  if (favoriteVideos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No favorites yet</h3>
        <p className="text-gray-400 mb-6">Start adding videos to your favorites to see them here.</p>
        <a
          href="/"
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Browse Videos
        </a>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {favoriteVideos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  )
}
