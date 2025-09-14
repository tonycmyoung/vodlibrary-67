"use client"

import type React from "react"

import { useActionState, useEffect, useState } from "react"
import { useFormStatus } from "react-dom"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, UserPlus, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { signUp } from "@/lib/actions"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-lg font-medium rounded-lg h-[60px]"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creating account...
        </>
      ) : (
        "Create Account"
      )}
    </Button>
  )
}

export default function SignUpForm() {
  const [state, formAction] = useActionState(signUp, null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const invitationToken = searchParams.get("invitation")

  const [formData, setFormData] = useState({
    fullName: "",
    teacher: "",
    school: "",
    email: "",
    password: "",
  })

  const [legalAgreements, setLegalAgreements] = useState({
    eulaAccepted: false,
    privacyAccepted: false,
  })

  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        router.push("/auth/login")
      }, 2000) // Redirect after 2 seconds

      return () => clearTimeout(timer)
    }
  }, [state?.success, router])

  useEffect(() => {
    if (state?.error) {
      setFormData((prev) => ({
        ...prev,
        password: "", // Only clear password on error
      }))
    }
  }, [state?.error])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleLegalAgreementChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setLegalAgreements((prev) => ({
      ...prev,
      [name]: checked,
    }))
  }

  const handleFormAction = (formData: FormData) => {
    if (invitationToken) {
      formData.append("invitationToken", invitationToken)
    }

    formData.append("eulaAccepted", legalAgreements.eulaAccepted.toString())
    formData.append("privacyAccepted", legalAgreements.privacyAccepted.toString())

    // Store current form values before submission
    const currentData = {
      fullName: formData.get("fullName") as string,
      teacher: formData.get("teacher") as string,
      school: formData.get("school") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    }
    setFormData(currentData)

    // Call the original form action
    formAction(formData)
  }

  const isFormValid = legalAgreements.eulaAccepted && legalAgreements.privacyAccepted

  return (
    <Card className="w-full max-w-md bg-black/80 border-red-800/50 backdrop-blur-sm">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
          <UserPlus className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-3xl font-bold text-white">
          {invitationToken ? "Complete Your Invitation" : "Join Okinawa Kobudo Library"}
        </CardTitle>
        <CardDescription className="text-gray-300 text-lg">
          {invitationToken
            ? "Complete your account setup to access the library"
            : "Create an account to access kobudo training videos"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={handleFormAction} className="space-y-6">
          {state?.error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
              {state.error}
            </div>
          )}

          {state?.success && (
            <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg">
              {state.success} Redirecting to login page...
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-300">
                  Full Name
                </label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Your full name"
                  required
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-red-500"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-red-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="teacher" className="block text-sm font-medium text-gray-300">
                  Teacher
                </label>
                <Input
                  id="teacher"
                  name="teacher"
                  type="text"
                  placeholder="Your teacher's name"
                  required
                  value={formData.teacher}
                  onChange={handleInputChange}
                  className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-red-500"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="school" className="block text-sm font-medium text-gray-300">
                  School
                </label>
                <Input
                  id="school"
                  name="school"
                  type="text"
                  placeholder="Your school/dojo name"
                  required
                  value={formData.school}
                  onChange={handleInputChange}
                  className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-red-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
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
              <p className="text-xs text-gray-400 italic leading-3 mt-0">
                min 6 characters with uppercase, lowercase, number, and symbol
              </p>
            </div>
          </div>

          <div className="space-y-4 border-t border-gray-700 pt-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <input
                  id="eulaAccepted"
                  name="eulaAccepted"
                  type="checkbox"
                  checked={legalAgreements.eulaAccepted}
                  onChange={handleLegalAgreementChange}
                  className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-600 rounded bg-gray-900"
                  required
                />
                <label htmlFor="eulaAccepted" className="text-sm text-gray-300 leading-5">
                  I agree to the{" "}
                  <Link href="/eula" target="_blank" className="text-red-400 hover:text-red-300 underline">
                    End User License Agreement (EULA)
                  </Link>
                </label>
              </div>

              <div className="flex items-start space-x-3">
                <input
                  id="privacyAccepted"
                  name="privacyAccepted"
                  type="checkbox"
                  checked={legalAgreements.privacyAccepted}
                  onChange={handleLegalAgreementChange}
                  className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-600 rounded bg-gray-900"
                  required
                />
                <label htmlFor="privacyAccepted" className="text-sm text-gray-300 leading-5">
                  I agree to the{" "}
                  <Link href="/privacy-notice" target="_blank" className="text-red-400 hover:text-red-300 underline">
                    Privacy Notice
                  </Link>
                </label>
              </div>
            </div>

            {!isFormValid && (
              <div className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/50 px-3 py-2 rounded">
                You must accept both the EULA and Privacy Notice to create an account.
              </div>
            )}
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 px-4 py-3 rounded-lg text-sm">
            <strong>Note:</strong> Your account will require admin approval before you can access the video library.
          </div>

          <div className={!isFormValid ? "opacity-50" : ""}>
            <SubmitButton />
          </div>

          <div className="text-center text-gray-400">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-red-400 hover:text-red-300 hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
