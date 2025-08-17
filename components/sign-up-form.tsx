"use client"

import { useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, UserPlus } from "lucide-react"
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

  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        router.push("/auth/login")
      }, 2000) // Redirect after 2 seconds

      return () => clearTimeout(timer)
    }
  }, [state?.success, router])

  return (
    <Card className="w-full max-w-md bg-black/80 border-red-800/50 backdrop-blur-sm">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
          <UserPlus className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-3xl font-bold text-white">Join TY Kobudo Library</CardTitle>
        <CardDescription className="text-gray-300 text-lg">
          Create an account to access kobudo training videos
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="space-y-6">
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
                className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-red-500"
              />
            </div>
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
                className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-red-500"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="bg-gray-900/50 border-gray-700 text-white focus:border-red-500"
              />
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 px-4 py-3 rounded-lg text-sm">
            <strong>Note:</strong> Your account will require admin approval before you can access the video library.
          </div>

          <SubmitButton />

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
