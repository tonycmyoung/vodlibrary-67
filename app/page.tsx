import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import VideoLibrary from "@/components/video-library"
import Header from "@/components/header"

async function trackUserLogin(userId: string) {
  try {
    console.log("[v0] Tracking login for user:", userId)
    const supabase = createClient()

    // Check if user already has a login record for today
    const today = new Date().toISOString().split("T")[0]
    const { data: existingLogin } = await supabase
      .from("user_logins")
      .select("id")
      .eq("user_id", userId)
      .gte("login_time", `${today}T00:00:00.000Z`)
      .lt("login_time", `${today}T23:59:59.999Z`)
      .single()

    if (!existingLogin) {
      console.log("[v0] No existing login today, creating new record")
      const { error } = await supabase.from("user_logins").insert({
        user_id: userId,
        login_time: new Date().toISOString(),
      })

      if (error) {
        console.error("[v0] Error tracking login:", error)
      } else {
        console.log("[v0] Login tracked successfully")
      }
    } else {
      console.log("[v0] Login already tracked for today")
    }
  } catch (error) {
    console.error("[v0] Login tracking failed:", error)
  }
}

export default async function Home() {
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

  // Check if user is approved
  const { data: userProfile, error } = await supabase
    .from("users")
    .select("is_approved, full_name, profile_image_url, role")
    .eq("id", user.id)
    .single()

  if (!userProfile?.is_approved) {
    redirect("/pending-approval")
  }

  await trackUserLogin(user.id)

  const userWithEmail = {
    id: user.id, // Always use the authenticated user's ID
    email: user.email,
    full_name: userProfile?.full_name || null,
    profile_image_url: userProfile?.profile_image_url || null,
    role: userProfile?.role || null,
    is_approved: userProfile?.is_approved || false,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-orange-900">
      <Header user={userWithEmail} />
      <VideoLibrary />
    </div>
  )
}
