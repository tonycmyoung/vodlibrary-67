"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"

export default function SignOutPage() {
  const router = useRouter()
  const [isSignedOut, setIsSignedOut] = useState(false)

  useEffect(() => {
    const performSignOut = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        )

        await supabase.auth.signOut()
        setIsSignedOut(true)
      } catch (error) {
        console.error("Signout error:", error)
        setIsSignedOut(true) // Still show as signed out even if error occurs
      }
    }

    performSignOut()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-red-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-black/60 backdrop-blur-md border border-red-800/30 rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-white font-bold text-xl">武道</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-4">{isSignedOut ? "Signed Out" : "Signing You Out"}</h1>

        <div className="space-y-4">
          {!isSignedOut && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
          )}

          <p className="text-gray-300 text-sm">
            {isSignedOut
              ? "You have been successfully signed out of the Okinawa Kobudo Library."
              : "You are being signed out of the Okinawa Kobudo Library."}
          </p>
        </div>

        <button
          onClick={() => router.push("/")}
          className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          Return to Home
        </button>
      </div>
    </div>
  )
}
