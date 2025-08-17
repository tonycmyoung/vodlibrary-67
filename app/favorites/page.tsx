import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Header from "@/components/header"
import FavoritesLibrary from "@/components/favorites-library"

export default async function FavoritesPage() {
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
  const { data: userProfile } = await supabase
    .from("users")
    .select("is_approved, full_name, profile_image_url, role") // Added role field to query
    .eq("id", user.id)
    .single()

  if (!userProfile?.is_approved) {
    redirect("/pending-approval")
  }

  const userWithEmail = {
    ...userProfile,
    email: user.email,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-orange-900">
      <Header user={userWithEmail} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-white mb-2">My Favorites</h1>
          <p className="text-gray-300">Videos you've saved for later</p>
        </div>
        <FavoritesLibrary />
      </div>
    </div>
  )
}
