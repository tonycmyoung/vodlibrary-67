import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Header from "@/components/header"
import UserProfile from "@/components/user-profile"

export default async function ProfilePage() {
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

  // Check if user is approved and get full profile
  const { data: userProfile } = await supabase
    .from("users")
    .select("is_approved, full_name, email, created_at, profile_image_url")
    .eq("id", user.id)
    .single()

  if (!userProfile?.is_approved) {
    redirect("/pending-approval")
  }

  // Get user stats
  const { data: favoriteCount } = await supabase
    .from("user_favorites")
    .select("id", { count: "exact" })
    .eq("user_id", user.id)

  const isAdmin = user.email === "admin@martialarts.com"

  const userWithStats = {
    ...userProfile,
    id: user.id,
    email: user.email, // Add email from auth user
    favorite_count: favoriteCount?.length || 0,
    isAdmin, // Add admin status
  }

  const userForHeader = {
    ...userProfile,
    email: user.email,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-orange-900">
      <Header user={userForHeader} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
          <p className="text-gray-300">Manage your account information</p>
        </div>
        <UserProfile user={userWithStats} />
      </div>
    </div>
  )
}
