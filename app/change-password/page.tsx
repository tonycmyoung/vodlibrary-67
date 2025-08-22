import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import ChangePasswordForm from "@/components/change-password-form"

export default async function ChangePasswordPage() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-orange-900 to-yellow-900 px-4 py-12">
      <div className="max-w-md mx-auto">
        <ChangePasswordForm />
      </div>
    </div>
  )
}
