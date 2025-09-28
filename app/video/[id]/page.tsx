"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import VideoPlayer from "@/components/video-player"
import Header from "@/components/header"
import { Skeleton } from "@/components/ui/skeleton"
import { getVideoViewCount } from "@/lib/actions/video-views"

interface VideoPageProps {
  params: {
    id: string
  }
}

interface User {
  id: string
  email: string | undefined
  is_approved: boolean
  full_name: string | null
  profile_image_url: string | null
  role: string
}

interface Video {
  id: string
  title: string
  description: string | null
  video_url: string
  thumbnail_url: string | null
  duration: number | null
  views: number
  is_published: boolean
  created_at: string
  categories: Array<{
    id: string
    name: string
    color: string
  }>
  performers: Array<{
    id: string
    name: string
  }>
  isFavorited: boolean
}

export default function VideoPage({ params }: VideoPageProps) {
  const [user, setUser] = useState<User | null>(null)
  const [video, setVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [userLoading, setUserLoading] = useState(true)
  const [videoLoading, setVideoLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    console.log("[v0] VideoPage component mounted for ID:", params.id)
  }, [params.id])

  useEffect(() => {
    async function loadUser() {
      console.log("[v0] Loading user data...")

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        console.log("[v0] No authenticated user, redirecting to login")
        router.push("/auth/login")
        return
      }

      console.log("[v0] Authenticated user found:", authUser.id)

      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("is_approved, full_name, profile_image_url, role")
        .eq("id", authUser.id)
        .single()

      if (profileError) {
        console.log("[v0] Error fetching user profile:", profileError)
        return
      }

      console.log("[v0] User profile loaded:", userProfile)

      if (!userProfile?.is_approved) {
        console.log("[v0] User not approved, redirecting to pending-approval")
        router.push("/pending-approval")
        return
      }

      setUser({
        id: authUser.id,
        email: authUser.email,
        ...userProfile,
      })
      setUserLoading(false)
      console.log("[v0] User data loaded successfully")
    }

    loadUser()
  }, [router, supabase])

  useEffect(() => {
    if (!user) return

    async function loadVideo() {
      console.log("[v0] Loading video data for ID:", params.id)

      const [videoResult, favoriteResult, categoriesResult, performersResult] = await Promise.all([
        supabase.from("videos").select("*").eq("id", params.id).eq("is_published", true).single(),
        supabase.from("user_favorites").select("id").eq("user_id", user.id).eq("video_id", params.id).maybeSingle(),
        supabase.from("video_categories").select("categories(id, name, color)").eq("video_id", params.id),
        supabase.from("video_performers").select("performers(id, name)").eq("video_id", params.id),
      ])

      const { data: videoData, error } = videoResult
      const { data: favorite } = favoriteResult
      const { data: videoCategories } = categoriesResult
      const { data: videoPerformers } = performersResult

      if (error) {
        console.log("[v0] Error loading video:", error)
        router.push("/404")
        return
      }

      if (!videoData) {
        console.log("[v0] No video data found for ID:", params.id)
        router.push("/404")
        return
      }

      console.log("[v0] Video data loaded successfully:", videoData.title)

      const viewCount = await getVideoViewCount(params.id)

      const videoWithCategories: Video = {
        ...videoData,
        views: viewCount,
        categories: videoCategories?.map((vc: any) => vc.categories) || [],
        performers: videoPerformers?.map((vp: any) => vp.performers) || [],
        isFavorited: !!favorite,
      }

      setVideo(videoWithCategories)
      setVideoLoading(false)
      console.log("[v0] Video component ready to render")
    }

    loadVideo()
  }, [user, params.id, router, supabase])

  useEffect(() => {
    setLoading(userLoading || videoLoading)
  }, [userLoading, videoLoading])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-orange-900">
      {userLoading ? (
        <div className="h-16 bg-black/20 border-b border-white/10">
          <div className="container mx-auto px-4 h-full flex items-center justify-between">
            <Skeleton className="h-8 w-32 bg-white/10" />
            <Skeleton className="h-8 w-8 rounded-full bg-white/10" />
          </div>
        </div>
      ) : user ? (
        <Header user={user} />
      ) : null}

      {videoLoading ? (
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="aspect-video bg-black/40 rounded-lg flex items-center justify-center">
              <div className="text-white/60 text-lg">Loading video...</div>
            </div>

            <div className="space-y-2">
              <Skeleton className="h-8 w-3/4 bg-white/10" />
              <Skeleton className="h-4 w-1/2 bg-white/10" />
            </div>

            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 bg-white/10 rounded-full" />
              <Skeleton className="h-6 w-20 bg-white/10 rounded-full" />
              <Skeleton className="h-6 w-18 bg-white/10 rounded-full" />
            </div>
          </div>
        </div>
      ) : video ? (
        <VideoPlayer video={video} />
      ) : null}
    </div>
  )
}
