import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AdminHeader from "@/components/admin-header"
import UserManagement from "@/components/user-management"

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user is admin
  const { data: userProfile } = await supabase
    .from("users")
    .select("is_approved, full_name, email, profile_image_url")
    .eq("id", user.id)
    .single()

  if (!userProfile?.is_approved || userProfile.email !== "acmyma@gmail.com") {
    redirect("/")
  }

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
          <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
          <p className="text-gray-300">Manage user accounts and permissions</p>
        </div>

        <UserManagement />
      </div>
    </div>
  )
}
