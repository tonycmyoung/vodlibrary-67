import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import VideoLibrary from "@/components/video-library"
import Header from "@/components/header"

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

  console.log("[v0] Home page - Auth user ID:", user.id)
  console.log("[v0] Home page - Auth user email:", user.email)

  // Check if user is approved
  const { data: userProfile, error } = await supabase
    .from("users")
    .select("is_approved, full_name, profile_image_url")
    .eq("id", user.id)
    .single()

  console.log("[v0] Home page - Database query result:", userProfile)
  console.log("[v0] Home page - Database query error:", error)
  console.log("[v0] Home page - User approval status:", userProfile?.is_approved)

  if (!userProfile?.is_approved) {
    console.log("[v0] Home page - Redirecting to pending approval")
    redirect("/pending-approval")
  }

  console.log("[v0] Home page - User is approved, showing video library")

  const userWithEmail = {
    ...userProfile,
    email: user.email,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-orange-900">
      <Header user={userWithEmail} />
      <VideoLibrary />
    </div>
  )
}
