import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import VideoPlayer from "@/components/video-player"
import Header from "@/components/header"

interface VideoPageProps {
  params: {
    id: string
  }
}

export default async function VideoPage({ params }: VideoPageProps) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const [userProfileResult, videoResult] = await Promise.all([
    // Check if user is approved
    supabase
      .from("users")
      .select("is_approved, full_name, profile_image_url, role")
      .eq("id", user.id)
      .single(),

    // Fetch video with categories and check favorite status in one query
    supabase
      .from("videos")
      .select(`
        *,
        video_categories(
          categories(id, name, color)
        ),
        user_favorites!inner(user_id)
      `)
      .eq("id", params.id)
      .eq("is_published", true)
      .eq("user_favorites.user_id", user.id)
      .single(),
  ])

  const { data: userProfile } = userProfileResult
  const { data: video, error } = videoResult

  if (!userProfile?.is_approved) {
    redirect("/pending-approval")
  }

  let videoData = video
  let isFavorited = !!video

  if (!video) {
    // Try fetching video without favorite check
    const { data: videoWithoutFavorite, error: videoError } = await supabase
      .from("videos")
      .select(`
        *,
        video_categories(
          categories(id, name, color)
        )
      `)
      .eq("id", params.id)
      .eq("is_published", true)
      .single()

    if (videoError || !videoWithoutFavorite) {
      notFound()
    }

    videoData = videoWithoutFavorite
    isFavorited = false
  }

  // Transform categories
  const videoWithCategories = {
    ...videoData,
    categories: videoData.video_categories.map((vc: any) => vc.categories),
    isFavorited,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-orange-900">
      <Header user={{ ...userProfile, id: user.id, email: user.email }} />
      <VideoPlayer video={videoWithCategories} />
    </div>
  )
}
