import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import VideoLibrary from "@/components/video-library"
import Header from "@/components/header"
import type { CurrentBelt } from "@/lib/utils/admin-header-user"

export default async function Home() {
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <h1 className="text-2xl font-bold mb-4 text-foreground">Connect Supabase to get started</h1>
      </div>
    )
  }

  // Use getSession instead of getUser - middleware already validated the session
  // This avoids a redundant server validation call, saving ~500-1000ms
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user

  // If no user, redirect to login (middleware should have caught this, but safety check)
  if (!user) {
    redirect("/auth/login")
  }

  // Fetch user profile data for display
  // Note: Middleware already handles approval check and admin redirect
  const { data: userProfile } = await supabase
    .from("users")
    .select(`
      is_approved, 
      full_name, 
      profile_image_url, 
      role,
      curriculum_set_id,
      current_belt:curriculums!current_belt_id(id, name, display_order, color)
    `)
    .eq("id", user.id)
    .single()

  // Safety fallback: if somehow middleware didn't catch unapproved user
  if (!userProfile?.is_approved) {
    redirect("/pending-approval")
  }

  const userWithEmail = {
    id: user.id,
    email: user.email ?? "",
    full_name: userProfile?.full_name || null,
    profile_image_url: userProfile?.profile_image_url || null,
    role: userProfile?.role || null,
    is_approved: userProfile?.is_approved || false,
    current_belt: userProfile?.current_belt as unknown as CurrentBelt | null | undefined,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-orange-900">
      <Header user={userWithEmail} />
      <VideoLibrary userProfile={{ curriculum_set_id: userProfile?.curriculum_set_id }} />
    </div>
  )
}
