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
  console.log("[v0] Video page loading for ID:", params.id)
  const startTime = Date.now()

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  console.log("[v0] Starting database queries...")

  const [userProfileResult, videoResult, favoriteResult] = await Promise.all([
    supabase.from("users").select("is_approved, full_name, profile_image_url, role").eq("id", user.id).single(),

    supabase.from("videos").select("*, views").eq("id", params.id).eq("is_published", true).single(),

    supabase.from("user_favorites").select("id").eq("user_id", user.id).eq("video_id", params.id).maybeSingle(),
  ])

  console.log("[v0] Database queries completed in:", Date.now() - startTime, "ms")

  const { data: userProfile } = userProfileResult
  const { data: video, error } = videoResult
  const { data: favorite } = favoriteResult

  if (!userProfile?.is_approved) {
    redirect("/pending-approval")
  }

  if (!video) {
    notFound()
  }

  const { data: videoCategories } = await supabase
    .from("video_categories")
    .select(`
      categories(id, name, color)
    `)
    .eq("video_id", params.id)

  console.log("[v0] Categories fetched in:", Date.now() - startTime, "ms total")

  const isFavorited = !!favorite

  // Transform categories
  const videoWithCategories = {
    ...video,
    categories: videoCategories?.map((vc: any) => vc.categories) || [],
    isFavorited,
  }

  console.log("[v0] Video page fully loaded in:", Date.now() - startTime, "ms")

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-orange-900">
      <Header user={{ ...userProfile, id: user.id, email: user.email }} />
      <VideoPlayer video={videoWithCategories} />
    </div>
  )
}
