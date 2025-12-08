import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import LoginForm from "@/components/login-form"
import { validateReturnTo, getAuthErrorMessage } from "@/lib/utils/auth"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { confirmed?: string; returnTo?: string; error?: string; reset?: string }
}) {
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <h1 className="text-2xl font-bold mb-4 text-foreground">Connect Supabase to get started</h1>
      </div>
    )
  }

  const returnTo = searchParams.returnTo
  const validatedReturnTo = validateReturnTo(returnTo)

  const errorCode = searchParams.error
  const errorMessage = getAuthErrorMessage(errorCode)

  // Check if user is already logged in
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    if (validatedReturnTo) {
      redirect(validatedReturnTo)
    } else {
      redirect("/")
    }
  }

  const resetSuccess = searchParams.reset === "success"

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-900 via-orange-900 to-yellow-900 px-4 py-12 sm:px-6 lg:px-8">
      {searchParams.confirmed === "true" && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">Email confirmed! Your account is pending administrator approval.</span>
          </div>
        </div>
      )}
      {resetSuccess && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">
              Password updated successfully! You can now sign in with your new password.
            </span>
          </div>
        </div>
      )}
      <LoginForm returnTo={validatedReturnTo} error={errorMessage} />
    </div>
  )
}
