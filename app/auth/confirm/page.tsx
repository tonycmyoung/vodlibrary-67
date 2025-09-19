import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Clock, Mail } from "lucide-react"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"

interface ConfirmPageProps {
  searchParams: {
    error?: string
    error_code?: string
    error_description?: string
    success?: string
  }
}

export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const { error, error_code, error_description, success } = searchParams

  const isSuccess = success === "true" && !error && !error_code
  const isExpired = error_code === "otp_expired" || error_description?.includes("expired")

  let statusMessage = ""
  if (error_description) {
    statusMessage = error_description
  } else if (error_code === "otp_expired") {
    statusMessage = "Your confirmation link has expired"
  } else if (error === "processing_failed") {
    statusMessage = "An error occurred while processing your confirmation"
  } else if (error) {
    statusMessage = "There was a problem with your confirmation"
  }

  const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  try {
    await serviceSupabase.from("auth_debug_logs").insert({
      event_type: "email_confirm_status",
      user_email: null,
      user_id: null,
      success: isSuccess,
      error_message: isSuccess
        ? null
        : `Confirmation page loaded with error: ${statusMessage || "Unknown error"}`,
      error_code: error || null,
      additional_data: {
        page_status: isSuccess ? "success" : "error",
        error_description: error_description || null,
        status_message: statusMessage || null,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (logError) {
    console.error("[v0] Failed to log confirm page status:", logError)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-900 via-orange-900 to-yellow-900 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md bg-black/80 border-yellow-600/50 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center">
            {isSuccess ? (
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-white" />
              </div>
            )}
          </div>

          <CardTitle className="text-3xl font-bold text-white">
            {isSuccess ? "Email Confirmed!" : "Confirmation Failed"}
          </CardTitle>

          <CardDescription className="text-gray-300 text-lg">
            {isSuccess ? "Your email has been verified" : statusMessage || "There was a problem with your confirmation"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Success State */}
          {isSuccess && (
            <>
              <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-6 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-2">Email Confirmed Successfully!</p>
                    <p className="text-sm text-green-300">
                      Your email address has been verified. Your account may need administrator approval before you can
                      access all features.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-500/10 border border-gray-500/50 text-gray-300 px-4 py-6 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-300">
                      If your account requires approval, an administrator will review your access. You'll receive an
                      email notification once approved.
                    </p>
                    <p className="text-sm text-cyan-300 mt-2">This usually takes 24-48 hours.</p>
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

          {/* Error State */}
          {!isSuccess && (
            <>
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-6 rounded-lg">
                <div className="flex items-start space-x-3">
                  <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-2">Confirmation Failed</p>
                    <p className="text-sm text-red-300">
                      {statusMessage || "There was a problem with your confirmation"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-3">
                <Button asChild className="w-full bg-red-600 hover:bg-red-700 text-white">
                  <Link href={`${process.env.FULL_SITE_URL || "/"}/auth/login`}>Try Signing In</Link>
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
