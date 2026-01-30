import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AdminHeader from "@/components/admin-header"
import TraceDashboard from "@/components/trace-dashboard"
import { serverTrace } from "@/lib/trace-logger"

export default async function AdminTracePage() {
  // Server-side trace test - logs when this page is loaded
  serverTrace.info("Trace admin page loaded", { category: "admin", payload: { source: "server-side" } })
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user profile to check admin status
  const { data: userProfile } = await supabase
    .from("users")
    .select("is_approved, full_name, email, profile_image_url, role")
    .eq("id", user.id)
    .single()

  // Only allow admins
  if (userProfile?.role !== "Admin") {
    redirect("/")
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
          <h1 className="text-3xl font-bold text-white mb-2">Trace Logs</h1>
          <p className="text-gray-300">
            Application-wide diagnostic logs for debugging and troubleshooting
          </p>
        </div>

        <TraceDashboard />
      </div>
    </div>
  )
}
