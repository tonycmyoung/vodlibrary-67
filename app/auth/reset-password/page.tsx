import ResetPasswordForm from "@/components/reset-password-form"

export default async function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-900 via-orange-900 to-yellow-900 px-4 py-12 sm:px-6 lg:px-8">
      <ResetPasswordForm />
    </div>
  )
}
