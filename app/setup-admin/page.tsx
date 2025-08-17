"use client"

import { createAdminUser } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Loader2 } from "lucide-react"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creating Admin...
        </>
      ) : (
        "Create Admin User"
      )}
    </Button>
  )
}

export default function SetupAdminPage() {
  const [state, formAction] = useActionState(createAdminUser, null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Setup Admin Account</CardTitle>
          <CardDescription>Create the admin account for the martial arts library</CardDescription>
        </CardHeader>
        <CardContent>
          {state?.error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
              {state.error}
            </div>
          )}

          {state?.success && (
            <div className="mb-4 bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg">
              {state.success}
            </div>
          )}

          <form action={formAction}>
            <SubmitButton />
          </form>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>
              <strong>Email:</strong> admin@martialarts.com
            </p>
            <p>
              <strong>Password:</strong> admin123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
