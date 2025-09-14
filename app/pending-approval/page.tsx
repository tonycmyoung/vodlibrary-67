import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Mail } from "lucide-react"

export default function PendingApprovalPage() {
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
                <p className="font-medium mb-2">Account Under Review</p>
                <p className="text-sm text-yellow-300">
                  Your account has been created successfully!<br />
                  An administrator will review and approve your access.<br />
                  You'll receive an email notification once approved.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center text-gray-400 text-sm">
            <p>This usually takes 24-48 hours.</p>
            <p className="mt-2">
              Questions? Contact us at{" "}
              <a href="mailto:acmyma@gmail.com" className="text-red-400 hover:text-red-300">
                acmyma@gmail.com
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
