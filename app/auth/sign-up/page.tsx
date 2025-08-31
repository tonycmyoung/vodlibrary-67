import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import SignUpForm from "@/components/sign-up-form"

export default async function SignUpPage() {
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <h1 className="text-2xl font-bold mb-4 text-foreground">Connect Supabase to get started</h1>
      </div>
    )
  }

  // Check if user is already logged in
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    // Check if user exists in our users table
    const { data: existingUser } = await supabase.from("users").select("id").eq("id", session.user.id).single()

    // If user exists in our database, redirect to home page
    // If user doesn't exist, they're invited and need to complete sign-up
    if (existingUser) {
      redirect("/")
    }
    // If no existingUser, allow them to continue to sign-up form
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-900 via-orange-900 to-yellow-900 px-4 py-12 sm:px-6 lg:px-8">
      <SignUpForm />
    </div>
  )
}
