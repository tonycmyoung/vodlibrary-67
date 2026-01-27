import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AdminHeader from "@/components/admin-header"
import AuditLogDashboard from "@/components/audit-log-dashboard"

export default async function AdminAuditPage() {
  const supabase = await createClient()
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
    .select("is_approved, full_name, email, profile_image_url, role")
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
        role: "Admin",
      })
      .select("is_approved, full_name, email, profile_image_url, role")
      .single()

    userProfile = updatedProfile || {
      is_approved: true,
      full_name: "Administrator",
      email: user.email,
      profile_image_url: null,
      role: "Admin",
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Audit Log</h1>
          <p className="text-gray-300">Track user signups, approvals, and deletions</p>
        </div>

        <AuditLogDashboard />
      </div>
    </div>
  )
}
