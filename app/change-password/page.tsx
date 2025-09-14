import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import ChangePasswordForm from "@/components/change-password-form"
import Header from "@/components/header"

export default async function ChangePasswordPage() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/login")
  }

  const { data: userProfile } = await supabase
    .from("users")
    .select("is_approved, full_name, profile_image_url, role")
    .eq("id", session.user.id)
    .single()

  if (!userProfile?.is_approved) {
    redirect("/pending-approval")
  }

  const userForHeader = {
    id: session.user.id,
    email: session.user.email,
    full_name: userProfile?.full_name || null,
    profile_image_url: userProfile?.profile_image_url || null,
    role: userProfile?.role || null,
    is_approved: userProfile?.is_approved || false,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-orange-900 to-yellow-900">
      <Header user={userForHeader} />
      <div className="px-4 py-12">
        <div className="max-w-md mx-auto">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  )
}
