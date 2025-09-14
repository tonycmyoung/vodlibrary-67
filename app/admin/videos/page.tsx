import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AdminHeader from "@/components/admin-header"
import VideoManagement from "@/components/video-management"

export default async function AdminVideosPage() {
  console.log("[v0] ADMIN PAGE - Starting processing")

  const supabase = createClient()
  console.log("[v0] ADMIN PAGE - Created Supabase client")

  const {
    data: { user },
  } = await supabase.auth.getUser()
  console.log("[v0] ADMIN PAGE - Got user:", user?.email)

  if (!user) {
    console.log("[v0] ADMIN PAGE - No user, redirecting to login")
    redirect("/auth/login")
  }

  // Check if user is admin
  console.log("[v0] ADMIN PAGE - Checking user profile")
  const { data: userProfile } = await supabase
    .from("users")
    .select("is_approved, full_name, email, profile_image_url")
    .eq("id", user.id)
    .single()
  console.log("[v0] ADMIN PAGE - User profile:", userProfile)

  if (!userProfile?.is_approved || userProfile.email !== "acmyma@gmail.com") {
    console.log("[v0] ADMIN PAGE - User not authorized, redirecting to home")
    redirect("/")
  }

  console.log("[v0] ADMIN PAGE - User authorized, rendering page")
  const userWithId = {
    ...userProfile,
    id: user.id,
    email: user.email,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
      <AdminHeader user={userWithId} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Video Management</h1>
          <p className="text-gray-300">Add, edit, and manage training videos</p>
        </div>

        <VideoManagement />
      </div>
    </div>
  )
}
