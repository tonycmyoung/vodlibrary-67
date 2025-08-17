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

  // Check if user is approved
  const { data: userProfile } = await supabase
    .from("users")
    .select("is_approved, full_name, profile_image_url, role") // Added role field to query
    .eq("id", user.id)
    .single()

  if (!userProfile?.is_approved) {
    redirect("/pending-approval")
  }

  // Fetch video with categories
  const { data: video, error } = await supabase
    .from("videos")
    .select(
      `
      *,
      video_categories(
        categories(id, name, color)
      )
    `,
    )
    .eq("id", params.id)
    .eq("is_published", true)
    .single()

  if (error || !video) {
    notFound()
  }

  // Transform categories
  const videoWithCategories = {
    ...video,
    categories: video.video_categories.map((vc: any) => vc.categories),
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-orange-900">
      <Header user={{ ...userProfile, email: user.email }} />
      <VideoPlayer video={videoWithCategories} />
    </div>
  )
}
