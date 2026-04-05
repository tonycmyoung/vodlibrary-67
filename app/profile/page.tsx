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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If no user, redirect to login
  if (!user) {
    redirect("/auth/login")
  }

  const { data: userProfile } = await supabase
    .from("users")
    .select(`
      is_approved,
      full_name,
      email,
      teacher,
      school,
      role,
      created_at,
      profile_image_url,
      current_belt_id,
      curriculum_set_id,
      current_belt:curriculums!current_belt_id(id, name, color, display_order),
      curriculum_set:curriculum_sets!curriculum_set_id(id, name)
    `)
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

  const { data: curriculums } = await supabase
    .from("curriculums")
    .select("id, name, color, display_order")
    .order("display_order", { ascending: true })

  // Fetch curriculum levels for user's curriculum set (if assigned)
  let curriculumLevels: Array<{ id: string; name: string; display_name: string; sort_order: number }> = []
  if (userProfile?.curriculum_set_id) {
    const { data: levels } = await supabase
      .from("curriculums")
      .select("id, name, display_order")
      .eq("curriculum_set_id", userProfile.curriculum_set_id)
      .order("display_order", { ascending: true })
    curriculumLevels = (levels || []).map((l) => ({
      id: l.id,
      name: l.name,
      display_name: l.name,
      sort_order: l.display_order,
    }))
  }

  const isAdmin = userProfile?.role === "Admin"

  const userWithStats = {
    ...userProfile,
    id: user.id,
    email: user.email,
    current_belt: userProfile?.current_belt || null,
    curriculum_set: userProfile?.curriculum_set || null,
    curriculum_set_id: userProfile?.curriculum_set_id || null,
    favorite_count: favoriteCount?.length || 0,
    isAdmin,
  }

  const userForHeader = {
    id: user.id, // Always use the authenticated user's ID
    email: user.email,
    full_name: userProfile?.full_name || null,
    profile_image_url: userProfile?.profile_image_url || null,
    role: userProfile?.role || null,
    is_approved: userProfile?.is_approved || false,
    current_belt: userProfile?.current_belt || null,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-orange-900">
      <Header user={userForHeader} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
          <p className="text-gray-300">Manage your account information</p>
        </div>
        <UserProfile user={userWithStats} curriculums={curriculums || []} curriculumLevels={curriculumLevels} />
      </div>
    </div>
  )
}
