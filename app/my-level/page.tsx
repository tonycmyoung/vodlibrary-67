import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import VideoLibrary from "@/components/video-library"
import Header from "@/components/header"

export default async function MyLevelPage() {
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <h1 className="text-2xl font-bold mb-4 text-foreground">Connect Supabase to get started</h1>
      </div>
    )
  }

  // Get the user from the server
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If no user, redirect to login
  if (!user) {
    redirect("/auth/login")
  }

  // Check if user is approved and get belt info
  const { data: userProfile } = await supabase
    .from("users")
    .select(`
      is_approved, 
      full_name, 
      profile_image_url, 
      role,
      current_belt_id,
      current_belt:curriculums!current_belt_id(id, name, display_order, color)
    `)
    .eq("id", user.id)
    .single()

  if (!userProfile?.is_approved) {
    redirect("/pending-approval")
  }

  const isAdminEmail = user.email === "acmyma@gmail.com"
  if (userProfile?.role === "Admin" || isAdminEmail) {
    redirect("/admin")
  }

  const userWithEmail = {
    id: user.id,
    email: user.email,
    full_name: userProfile?.full_name || null,
    profile_image_url: userProfile?.profile_image_url || null,
    role: userProfile?.role || null,
    is_approved: userProfile?.is_approved || false,
    current_belt: userProfile?.current_belt || null,
  }

  // Calculate max curriculum order (user's belt + 1 for next level)
  const maxCurriculumOrder = userProfile?.current_belt ? userProfile.current_belt.display_order + 1 : null

  let nextBeltName = "Next Level"
  if (maxCurriculumOrder) {
    const { data: nextBelt } = await supabase
      .from("curriculums")
      .select("name")
      .eq("display_order", maxCurriculumOrder)
      .maybeSingle() // Use maybeSingle() instead of single() to handle 0 rows gracefully

    if (nextBelt) {
      nextBeltName = nextBelt.name
    } else if (userProfile?.current_belt) {
      // User is at maximum belt level, use current belt name
      nextBeltName = userProfile.current_belt.name
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-orange-900">
      <Header user={userWithEmail} />
      <VideoLibrary maxCurriculumOrder={maxCurriculumOrder} storagePrefix="myLevel" nextBeltName={nextBeltName} />
    </div>
  )
}
