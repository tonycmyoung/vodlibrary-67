import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Header from "@/components/header"
import StudentManagement from "@/components/student-management"

export default async function StudentsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user is a Head Teacher
  const { data: userProfile } = await supabase
    .from("users")
    .select("is_approved, full_name, email, profile_image_url, role, school")
    .eq("id", user.id)
    .single()

  if (!userProfile?.is_approved || userProfile.role !== "Head Teacher") {
    redirect("/")
  }

  const userWithId = {
    ...userProfile,
    id: user.id,
    email: user.email,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-black">
      <Header user={userWithId} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Student Management</h1>
          <p className="text-gray-300">Manage students from your school: {userProfile.school}</p>
          <p className="text-gray-300 italic"><strong>Teacher role:</strong> has the added ability to invite others.</p>
          <p className="text-gray-300 italic"><strong>Head Teacher role:</strong> has access to this page, for their school.</p>
        </div>

        <StudentManagement headTeacherSchool={userProfile.school || ""} headTeacherId={user.id} />
      </div>
    </div>
  )
}
