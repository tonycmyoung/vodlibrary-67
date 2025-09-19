import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Clock, Mail, AlertCircle } from "lucide-react"
import Link from "next/link"

interface ConfirmPageProps {
  searchParams: {
    confirmed?: string
    approved?: string // Added approved parameter
    error?: string
  }
}

export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const { confirmed, approved, error } = searchParams // Extract approved parameter

  let userStatus: "confirmed_approved" | "confirmed_pending" | "error" | "unknown" = "unknown"
  let userInfo: { full_name?: string; email?: string } = {}
  let errorMessage = ""

  // Handle error cases
  if (error) {
    userStatus = "error"
    switch (error) {
      case "expired":
        errorMessage = "Your confirmation link has expired. Please request a new one."
        break
      case "invalid":
        errorMessage = "This confirmation link is invalid or has already been used."
        break
      case "missing_params":
        errorMessage = "Invalid confirmation link format."
        break
      case "verification_failed":
        errorMessage = "Email confirmation failed. Please try again."
        break
      case "no_session":
        errorMessage = "Confirmation processed but session creation failed."
        break
      case "processing_failed":
        errorMessage = "An error occurred while processing your confirmation."
        break
      default:
        errorMessage = "An unexpected error occurred during confirmation."
    }
  }

  // Handle successful confirmation
  if (confirmed === "true" && !error) {
    if (approved === "true") {
      userStatus = "confirmed_approved"
    } else {
      userStatus = "confirmed_pending"
    }

    userInfo = {
      full_name: undefined, // We don't have this from the callback
      email: undefined, // We don't have this from the callback
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-900 via-orange-900 to-yellow-900 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md bg-black/80 border-yellow-600/50 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center">
            {userStatus === "confirmed_approved" && (
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
            )}
            {userStatus === "confirmed_pending" && (
              <div className="w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-white" />
              </div>
            )}
            {userStatus === "error" && (
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-white" />
              </div>
            )}
            {userStatus === "unknown" && (
              <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
            )}
          </div>

          <CardTitle className="text-3xl font-bold text-white">
            {userStatus === "confirmed_approved" && "Welcome to the Library!"}
            {userStatus === "confirmed_pending" && "Email Confirmed!"}
            {userStatus === "error" && "Confirmation Failed"}
            {userStatus === "unknown" && "Email Confirmation"}
          </CardTitle>

          <CardDescription className="text-gray-300 text-lg">
            {userStatus === "confirmed_approved" && "Your account is ready to use"}
            {userStatus === "confirmed_pending" && "Your email has been verified"}
            {userStatus === "error" && "There was a problem with your confirmation"}
            {userStatus === "unknown" && "Processing your confirmation..."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Success - Approved User */}
          {userStatus === "confirmed_approved" && (
            <>
              <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-6 rounded-lg">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-2">You're all set!</p>
                    <p className="text-sm text-green-300">
                      {userInfo.full_name && `Welcome, ${userInfo.full_name}! `}
                      Your email has been confirmed and your account has been approved. You now have full access to the
                      Okinawa Kobudo Library.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-3">
                <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-medium">
                  <Link href={`${process.env.FULL_SITE_URL || "/"}`}>Access the Library</Link>
                </Button>
              </div>
            </>
          )}

          {/* Success - Pending Approval */}
          {userStatus === "confirmed_pending" && (
            <>
              <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 px-4 py-6 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-2">Email Confirmed Successfully!</p>
                    <p className="text-sm text-yellow-300">
                      {userInfo.full_name && `Thank you, ${userInfo.full_name}! `}
                      Your email address has been verified. Your account is now pending administrator approval.
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

              <div className="flex flex-col space-y-3">
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-600 bg-transparent"
                >
                  <Link href={`${process.env.FULL_SITE_URL || "/"}/auth/login`}>Back to Login</Link>
                </Button>
              </div>
            </>
          )}

          {/* Error Cases */}
          {userStatus === "error" && (
            <>
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-6 rounded-lg">
                <div className="flex items-start space-x-3">
                  <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-2">Confirmation Failed</p>
                    <p className="text-sm text-red-300">{errorMessage}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-3">
                <Button asChild className="w-full bg-red-600 hover:bg-red-700 text-white">
                  <Link href={`${process.env.FULL_SITE_URL || "/"}/auth/login`}>Try Signing In</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-600 bg-transparent"
                >
                  <Link href={`${process.env.FULL_SITE_URL || "/"}/auth/sign-up`}>Create New Account</Link>
                </Button>
              </div>
            </>
          )}

          {/* Unknown State */}
          {userStatus === "unknown" && (
            <>
              <div className="bg-gray-500/10 border border-gray-500/50 text-gray-400 px-4 py-6 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-300">
                      If you're seeing this page without clicking a confirmation link, please check your email for the
                      confirmation message.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-3">
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-600 bg-transparent"
                >
                  <Link href={`${process.env.FULL_SITE_URL || "/"}/auth/login`}>Back to Login</Link>
                </Button>
              </div>
            </>
          )}

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
