import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Header from "@/components/header"
import SendMessageForm from "@/components/send-message-form"

export default async function ContactPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: userProfile } = await supabase
    .from("users")
    .select("id, full_name, is_approved, email, profile_image_url, role")
    .eq("id", user.id)
    .single()

  if (!userProfile) {
    redirect("/auth/login")
  }

  if (!userProfile.is_approved) {
    redirect("/pending-approval")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-orange-900">
      <Header user={userProfile} />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Contact Admin</h1>
            <p className="text-gray-300">
              Send a message to the administrator for questions, feedback, or support requests.
            </p>
          </div>

          <SendMessageForm userId={userProfile.id} userName={userProfile.full_name} />

          <div className="mt-8 text-center">
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-2">Alternative Contact</h2>
              <p className="text-gray-400 mb-2">For urgent matters, you can also reach out directly via email:</p>
              <a href="mailto:admin@tykobudo.com.au" className="text-red-400 hover:text-red-300 font-medium">
                admin@tykobudo.com.au
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
