"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Mail, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

interface UserStatus {
  email_confirmed: boolean
  is_approved: boolean
  email?: string
  full_name?: string
}

export default function PendingApprovalPage() {
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        )

        // Get current session
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user) {
          // No session - sign out and show generic message
          await supabase.auth.signOut()
          setUserStatus(null)
          setLoading(false)
          return
        }

        // Check user's confirmation and approval status
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("is_approved, full_name")
          .eq("id", session.user.id)
          .single()

        if (userError) {
          console.error("Error fetching user data:", userError)
          setError("Unable to check account status")
          setLoading(false)
          return
        }

        setUserStatus({
          email_confirmed: !!session.user.email_confirmed_at,
          is_approved: userData?.is_approved || false,
          email: session.user.email,
          full_name: userData?.full_name,
        })
      } catch (err) {
        console.error("Status check error:", err)
        setError("Unable to check account status")
      } finally {
        setLoading(false)
      }
    }

    checkUserStatus()
  }, [])

  const getStatusContent = () => {
    if (loading) {
      return {
        icon: <Clock className="w-8 h-8 text-white" />,
        iconBg: "bg-gray-600",
        title: "Checking Status...",
        subtitle: "Please wait while we check your account",
      }
    }

    if (error || !userStatus) {
      return {
        icon: <AlertCircle className="w-8 h-8 text-white" />,
        iconBg: "bg-gray-600",
        title: "Account Status",
        subtitle: "Please sign up or sign in to check your status",
      }
    }

    if (!userStatus.email_confirmed) {
      return {
        icon: <Mail className="w-8 h-8 text-white" />,
        iconBg: "bg-orange-600",
        title: "Email Confirmation Required",
        subtitle: "Please check your email and confirm your address",
      }
    }

    if (userStatus.email_confirmed && userStatus.is_approved) {
      return {
        icon: <CheckCircle className="w-8 h-8 text-white" />,
        iconBg: "bg-green-600",
        title: "Account Approved!",
        subtitle: "Your account is ready to use",
      }
    }

    return {
      icon: <Clock className="w-8 h-8 text-white" />,
      iconBg: "bg-yellow-600",
      title: "Approval Pending",
      subtitle: "Your email is confirmed, waiting for approval",
    }
  }

  const statusContent = getStatusContent()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-900 via-orange-900 to-yellow-900 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md bg-black/80 border-yellow-600/50 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center">
          <div className={`mx-auto w-16 h-16 ${statusContent.iconBg} rounded-full flex items-center justify-center`}>
            {statusContent.icon}
          </div>
          <CardTitle className="text-3xl font-bold text-white">{statusContent.title}</CardTitle>
          <CardDescription className="text-gray-300 text-lg">{statusContent.subtitle}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Email not confirmed */}
          {userStatus && !userStatus.email_confirmed && (
            <div className="bg-orange-500/10 border border-orange-500/50 text-orange-400 px-4 py-6 rounded-lg">
              <div className="flex items-start space-x-3">
                <Mail className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-2">Email Confirmation Required</p>
                  <p className="text-sm text-orange-300">
                    Please check your email and click the confirmation link. You have 24 hours to confirm your email
                    address.
                  </p>
                  <p className="text-sm text-orange-300 mt-2">
                    Look for an email from <strong>Supabase Auth</strong> with subject{" "}
                    <strong>"Confirm Your Signup - Okinawa Kobudo Library"</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Email confirmed, approved */}
          {userStatus && userStatus.email_confirmed && userStatus.is_approved && (
            <>
              <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-6 rounded-lg">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-2">You're all set!</p>
                    <p className="text-sm text-green-300">
                      {userStatus.full_name && `Welcome, ${userStatus.full_name}! `}
                      Your account has been approved and you now have full access to the Okinawa Kobudo Library.
                    </p>
                  </div>
                </div>
              </div>
              <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-medium">
                <Link href="/">Access the Library</Link>
              </Button>
            </>
          )}

          {/* Email confirmed, pending approval */}
          {userStatus && userStatus.email_confirmed && !userStatus.is_approved && (
            <>
              <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 px-4 py-6 rounded-lg">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-2">Email Confirmed!</p>
                    <p className="text-sm text-yellow-300">
                      {userStatus.full_name && `Thank you, ${userStatus.full_name}! `}
                      Your email has been confirmed. Your account is now pending administrator approval.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 px-4 py-6 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-cyan-300">
                      An administrator will review and approve your access. You'll receive an email notification once
                      approved.
                    </p>
                    <p className="text-sm text-cyan-300 mt-2">This usually takes 24-48 hours.</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* No user session or error */}
          {(!userStatus || error) && !loading && (
            <div className="bg-gray-500/10 border border-gray-500/50 text-gray-400 px-4 py-6 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-300">{error || "Please sign in to check your account status."}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col space-y-3">
            <Button
              asChild
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-600 bg-transparent"
            >
              <Link href="/auth/login">Sign In</Link>
            </Button>
            {(!userStatus || error) && (
              <Button
                asChild
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-600 bg-transparent"
              >
                <Link href="/auth/sign-up">Create Account</Link>
              </Button>
            )}
          </div>

          {/* Contact Information */}
          <div className="text-center text-gray-400 text-sm border-t border-gray-700 pt-4">
            <p>
              Questions? Contact us at{" "}
              <a href="mailto:admin@tykobudo.com.au" className="text-red-400 hover:text-red-300">
                admin@tykobudo.com.au
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
