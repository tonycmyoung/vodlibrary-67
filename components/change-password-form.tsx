"use client"

import { useState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Lock, Eye, EyeOff } from "lucide-react"
import { changePassword } from "@/lib/actions"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="w-full bg-red-600 hover:bg-red-700 text-white">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Updating password...
        </>
      ) : (
        <>
          <Lock className="mr-2 h-4 w-4" />
          Update Password
        </>
      )}
    </Button>
  )
}

export default function ChangePasswordForm() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (message?.type === "success") {
      const timer = setTimeout(() => {
        window.location.href = "/"
      }, 3000) // Increased from 2000ms to 3000ms for better timing

      return () => clearTimeout(timer)
    }
  }, [message])

  const handleSubmit = async (formData: FormData) => {
    const result = await changePassword(null, formData)

    if (result?.success) {
      setMessage({ type: "success", text: result.success })
      // Reset form
      const form = document.getElementById("change-password-form") as HTMLFormElement
      form?.reset()
    } else if (result?.error) {
      setMessage({ type: "error", text: result.error })
    }
  }

  return (
    <Card className="bg-black/60 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Lock className="mr-2 h-5 w-5" />
          Change Password
        </CardTitle>
        <CardDescription className="text-gray-300">
          Update your account password. You'll need to enter your current password to confirm the change.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form id="change-password-form" action={handleSubmit} className="space-y-4">
          {message && (
            <div
              className={`px-4 py-3 rounded-lg ${
                message.type === "success"
                  ? "bg-green-500/10 border border-green-500/50 text-green-400"
                  : "bg-red-500/10 border border-red-500/50 text-red-400"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-300">
              Current Password
            </label>
            <div className="relative">
              <Input
                id="currentPassword"
                name="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                required
                className="bg-gray-900/50 border-gray-700 text-white focus:border-red-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300">
              New Password
            </label>
            <div className="relative">
              <Input
                id="newPassword"
                name="newPassword"
                type={showNewPassword ? "text" : "password"}
                required
                minLength={6}
                className="bg-gray-900/50 border-gray-700 text-white focus:border-red-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
              Confirm New Password
            </label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={6}
                className="bg-gray-900/50 border-gray-700 text-white focus:border-red-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 px-4 py-3 rounded-lg text-sm">
            <strong>Note:</strong> After changing your password, you may need to sign in again on other devices.
          </div>

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  )
}
