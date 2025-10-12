import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import ResetPasswordForm from "@/components/reset-password-form"

export default async function ResetPasswordPage() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If no session, user hasn't clicked the reset link or it expired
  if (!session) {
    redirect("/auth/login?error=reset_expired")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-900 via-orange-900 to-yellow-900 px-4 py-12 sm:px-6 lg:px-8">
      <ResetPasswordForm />
    </div>
  )
}
