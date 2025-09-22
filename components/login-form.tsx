"use client"

import type React from "react"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "@/lib/actions"
import { useState } from "react"
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
          Signing in...
        </>
      ) : (
        "Sign In"
      )}
    </Button>
  )
}

export default function LoginForm() {
  const router = useRouter()
  const [state, formAction] = useActionState(signIn, null)
  const [resetEmail, setResetEmail] = useState("")
  const [resetMessage, setResetMessage] = useState("")
  const [resetError, setResetError] = useState("")
  const [isResetting, setIsResetting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showResetInput, setShowResetInput] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail) {
      setResetError("Please enter your email address")
      return
    }

    setIsResetting(true)
    setResetError("")
    setResetMessage("")

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    setIsResetting(false)

    if (error) {
      setResetError("Failed to send reset email. Please try again.")
    } else {
      setResetMessage("Password reset email sent! Check your inbox.")
      setResetEmail("")
      setShowResetInput(false)
    }
  }

  return (
    <Card className="w-full max-w-md bg-black/80 border-red-800/50 backdrop-blur-sm">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-lg leading-tight">古<br />武道</span>
        </div>
        <CardTitle className="text-3xl font-bold text-white">{"Welcome to the\nOkinawa Kobudo Library"}</CardTitle>
        <CardDescription className="text-gray-300 text-lg whitespace-pre-line">
          {
            "This library is invite-only for\nMatayoshi/Okinawa Kobudo Australia Students.\nSign in, or request an account, below."
          }
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="space-y-3">
          {state?.error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
              {state.error}
            </div>
          )}

          {resetMessage && (
            <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg">
              {resetMessage}
            </div>
          )}
          {resetError && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">{resetError}</div>
          )}

          <div className="space-y-3">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 leading-5">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-red-500"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 leading-5">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
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
          </div>

          <SubmitButton />

          <div className="text-center text-gray-400">
            Don't have an account?{" "}
            <Link href="/auth/sign-up" className="text-red-400 hover:text-red-300 hover:underline">
              Request one
            </Link>
          </div>
        </form>

        <div className="text-center mt-4">
          {!showResetInput ? (
            <button
              type="button"
              onClick={() => setShowResetInput(true)}
              disabled={isResetting}
              className="text-red-400 hover:text-red-300 hover:underline text-sm disabled:opacity-50"
            >
              Forgot your password?
            </button>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-2">
              <Input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Enter email for reset"
                className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-red-500"
                required
              />
              <div className="flex gap-2 justify-center">
                <Button
                  type="submit"
                  disabled={isResetting}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isResetting ? "Sending..." : "Send Reset"}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowResetInput(false)
                    setResetEmail("")
                    setResetError("")
                  }}
                  size="sm"
                  variant="outline"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-700/50">
          <p className="text-xs text-gray-400 italic text-center leading-relaxed">
            By accessing or using this video platform, you agree to abide by our End User License Agreement. All videos
            are owned by Tony Young and are provided solely for private viewing by authorized members. Unauthorized
            reproduction or distribution is strictly prohibited.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
