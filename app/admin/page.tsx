import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AdminHeader from "@/components/admin-header"
import AdminDashboardClient from "@/components/admin-dashboard-client"

export default async function AdminDashboard() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  if (user.email !== "acmyma@gmail.com") {
    redirect("/")
  }

  // Get or create admin user profile
  let { data: userProfile } = await supabase
    .from("users")
    .select("is_approved, full_name, email, profile_image_url")
    .eq("id", user.id)
    .single()

  if (!userProfile?.is_approved) {
    const { data: updatedProfile } = await supabase
      .from("users")
      .upsert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || "Administrator",
        is_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      })
      .select("is_approved, full_name, email, profile_image_url")
      .single()

    userProfile = updatedProfile || {
      is_approved: true,
      full_name: "Administrator",
      email: user.email,
      profile_image_url: null,
    }
  }

  const userWithId = {
    ...userProfile,
    id: user.id,
    email: user.email,
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <AdminHeader user={userWithId} />
      <div className="container mx-auto px-4 py-8">
        <AdminDashboardClient />
      </div>
    </div>
  )
}
