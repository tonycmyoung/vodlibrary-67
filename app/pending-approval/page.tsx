"use client"

import { useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Mail } from "lucide-react"

export default function PendingApprovalPage() {
  useEffect(() => {
    const performSignOut = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        )

        await supabase.auth.signOut()
      } catch (error) {
        console.error("Signout error:", error)
      }
    }

    performSignOut()
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-900 via-orange-900 to-yellow-900 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md bg-black/80 border-yellow-600/50 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-white">Approval Pending</CardTitle>
          <CardDescription className="text-gray-300 text-lg">Welcome!</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 px-4 py-6 rounded-lg">
            <div className="flex items-start space-x-3">
              <Mail className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium mb-2">Next ...</p>
                <p className="text-center text-sm text-yellow-300">
                  Your account has been created successfully!
                  <br />
                  If you have just finished signing up, you'll need to confirm your email address{" "}
                  <strong>WITHIN 24 HOURS</strong>.<br />
                  Look for an email <em>(check your junk/spam)</em>:
                </p>
                <p className="text-sm text-yellow-300 mt-2">
                  From: <strong>Supabase Auth</strong>
                  <br />
                  Subject: <strong>Confirm Your Signup - Okinawa Kobudo Library</strong>
                  <br />
                </p>
              </div>
            </div>
          </div>

          <div className="bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 px-4 py-6 rounded-lg">
            <div className="flex items-start space-x-3">
              <div>
                <p className="text-center text-sm text-cyan-300">
                  The administrator will then review and approve your access.
                </p>
                <p className="text-center text-sm text-cyan-300 mt-2">
                  You'll receive an email notification once approved.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center text-gray-200 text-sm">
            <p>This usually takes 24-48 hours.</p>
            <p className="mt-2">
              Questions? Contact us at{" "}
              <a href="mailto:admin@tykobudo.com.au" className="text-red-400 hover:text-red-300">
                admin@tykobudo.com.au
              </a>
            </p>
            <p className="mt-4">
              <a href="/auth/login" className="text-red-400 hover:text-red-300 underline">
                Sign in to your account
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
