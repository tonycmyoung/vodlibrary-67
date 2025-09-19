"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { signOutServerAction } from "@/lib/actions"

export default function SignOutPage() {
  const router = useRouter()

  useEffect(() => {
    const handleSignOut = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        )

        await supabase.auth.signOut()

        await signOutServerAction()

        router.push("/")
      } catch (error) {
        console.error("Sign out error:", error)
        router.push("/")
      }
    }

    handleSignOut()
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-black/90 backdrop-blur-sm rounded-lg p-8 max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4"></div>
        <p className="text-white">Signing out...</p>
      </div>
    </div>
  )
}
