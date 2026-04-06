import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AdminHeader from "@/components/admin-header"
import AdminDashboardClient from "@/components/admin-dashboard-client"

export default async function AdminDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get admin user profile
  let { data: userProfile } = await supabase
    .from("users")
    .select("is_approved, full_name, email, profile_image_url, role")
    .eq("id", user.id)
    .single()

  // Only allow admin users
  if (!userProfile?.is_approved || userProfile.role !== "Admin") {
    redirect("/")
  }

  if (!userProfile) {
    const { data: updatedProfile } = await supabase
      .from("users")
      .upsert({
        id: user.id,
        email: user.email ?? "",
        full_name: user.user_metadata?.full_name || "Administrator",
        is_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      })
      .select("is_approved, full_name, email, profile_image_url, role")
      .single()

    userProfile = updatedProfile || {
      is_approved: true,
      full_name: "Administrator",
      email: user.email ?? "",
      profile_image_url: null,
      role: "Admin",
    }
  }

  const userWithId = {
    id: user.id,
    email: user.email ?? "",
    full_name: userProfile?.full_name ?? null,
    is_approved: userProfile?.is_approved ?? false,
    profile_image_url: userProfile?.profile_image_url ?? null,
    role: userProfile?.role ?? "Admin",
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
