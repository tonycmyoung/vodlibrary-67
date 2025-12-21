"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react"
import { updatePassword } from "@/lib/actions"
import { useState, useEffect } from "react"
import { useFormState, useFormStatus } from "react-dom"
import { createClient } from "@/lib/supabase/client"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-red-600 hover:bg-red-700 text-white py-3 text-lg font-medium rounded-lg h-[48px]"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Updating Password...
        </>
      ) : (
        "Update Password"
      )}
    </Button>
  )
}

export default function ResetPasswordForm() {
  const [state, formAction] = useFormState(updatePassword, null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [hasSession, setHasSession] = useState(false)

  const hasMinLength = password.length >= 8
  const passwordsMatch = password === confirmPassword && password.length > 0

  useEffect(() => {
    const supabase = createClient()

    // Check for existing session first
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (session) {
        setHasSession(true)
        setIsLoading(false)
        return
      }
    })

    // Listen for auth state changes (handles password recovery flow)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setHasSession(true)
        setIsLoading(false)
      } else if (event === "SIGNED_IN" && session) {
        setHasSession(true)
        setIsLoading(false)
      } else if (event === "SIGNED_OUT") {
        setHasSession(false)
        setSessionError("Your password reset link has expired. Please request a new one.")
        setIsLoading(false)
      }
    })

    // Set timeout to show error if no session after 5 seconds
    const timeout = setTimeout(() => {
      if (!hasSession) {
        setSessionError("Unable to verify password reset link. Please request a new one.")
        setIsLoading(false)
      }
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [hasSession])

  if (isLoading) {
    return (
      <Card className="w-full max-w-md bg-black/80 border-red-800/50 backdrop-blur-sm">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-red-500 mb-4" />
          <p className="text-gray-300">Verifying password reset link...</p>
        </CardContent>
      </Card>
    )
  }

  if (sessionError || !hasSession) {
    return (
      <Card className="w-full max-w-md bg-black/80 border-red-800/50 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
            <XCircle className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Auth session missing!</CardTitle>
          <CardDescription className="text-gray-300">
            {sessionError || "Your password reset link is invalid or has expired."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => (window.location.href = "/auth/login")}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            Return to Login
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md bg-black/80 border-red-800/50 backdrop-blur-sm">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-lg leading-tight">
            古<br />
            武道
          </span>
        </div>
        <CardTitle className="text-3xl font-bold text-white">Reset Your Password</CardTitle>
        <CardDescription className="text-gray-300 text-lg">Enter your new password below</CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-start gap-2">
              <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>{state.error}</span>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 leading-5">
                New Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-gray-900/50 border-gray-700 text-white focus:border-red-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 leading-5">
                Confirm New Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-gray-900/50 border-gray-700 text-white focus:border-red-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              {hasMinLength ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-gray-600" />
              )}
              <span className={hasMinLength ? "text-green-500" : ""}>At least 8 characters</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              {passwordsMatch ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-gray-600" />
              )}
              <span className={passwordsMatch ? "text-green-500" : ""}>Passwords match</span>
            </div>
          </div>

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  )
}
