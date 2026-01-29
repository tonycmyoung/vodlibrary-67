"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Search,
  Mail,
  Calendar,
  Loader2,
  Trash2,
  Clock,
  LogIn,
  Filter,
  Edit2,
  Save,
  X,
  GraduationCap,
  Building,
  Eye,
  Play,
  UserPlus,
  User,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { deleteUserCompletely } from "@/lib/actions"
import { formatDate } from "@/lib/utils/date"
import UserSortControl from "@/components/user-sort-control"
import UserFilter from "@/components/user-filter"
import { fetchStudentsForHeadTeacher, updateUserFields } from "@/lib/actions/users"
import InviteUserModal from "@/components/invite-user-modal"
import { toast } from "react-toastify"

interface UserInterface {
  id: string
  email: string
  full_name: string | null
  teacher: string | null
  school: string | null
  role: string | null
  created_at: string
  is_approved: boolean
  approved_at: string | null
  profile_image_url: string | null
  last_login: string | null
  login_count: number
  last_view: string | null
  view_count: number
  current_belt_id: string | null
  current_belt?: {
    id: string
    name: string
    color: string
    display_order: number
  } | null
  inviter?: {
    full_name: string
  }
}

interface StudentManagementProps {
  headTeacherSchool: string
  headTeacherId: string
  userRole: string
}

export default function StudentManagement({ headTeacherSchool, headTeacherId, userRole }: StudentManagementProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const storagePrefix = "studentManagement"

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  const [urlState] = useState(() => {
    const role = searchParams.get("role") || "all"
    const school = searchParams.get("school") || "all"
    const search = searchParams.get("search") || ""
    const belt = searchParams.get("belt") || "all"
    const sortBy = searchParams.get("sortBy") || "full_name"
    const sortOrder = searchParams.get("sortOrder") || "asc"
    return { role, school, search, belt, sortBy, sortOrder }
  })

  const [users, setUsers] = useState<UserInterface[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserInterface[]>([])
  const [searchQuery, setSearchQuery] = useState(urlState.search)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(urlState.search)
  const [loading, setLoading] = useState(true)
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set())

  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{
    full_name: string
    teacher: string
    school: string
    current_belt_id: string | null
  }>({
    full_name: "",
    teacher: "",
    school: "",
    current_belt_id: null,
  })

  const [selectedRole, setSelectedRole] = useState(urlState.role)
  const [selectedSchool, setSelectedSchool] = useState(urlState.school)
  const [selectedBelt, setSelectedBelt] = useState(urlState.belt)
  const [sortBy, setSortBy] = useState(urlState.sortBy)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(urlState.sortOrder)
  const [curriculums, setCurriculums] = useState<
    Array<{ id: string; name: string; color: string; display_order: number }>
  >([])

  const processedData = useMemo(() => {
    if (!users.length) return { roles: [], schools: [], belts: [] }

    const roleSet = new Set<string>()
    const schoolSet = new Set<string>()
    const beltSet = new Set<string>()

    users.forEach((user) => {
      if (user.role?.trim()) {
        roleSet.add(user.role)
      }
      if (user.school?.trim()) {
        schoolSet.add(user.school)
      }
      if (user.current_belt?.id?.trim()) {
        beltSet.add(user.current_belt.id)
      }
    })

    return {
      roles: Array.from(roleSet).sort((a, b) => a.localeCompare(b)),
      schools: Array.from(schoolSet).sort((a, b) => a.localeCompare(b)),
      belts: Array.from(beltSet).sort((a, b) => a.localeCompare(b)),
    }
  }, [users])

  const processedUsers = useMemo(() => {
    let result = [...users]

    // Apply search filter
    if (debouncedSearchQuery) {
      result = result.filter(
        (user) =>
          user.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          user.full_name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          user.teacher?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          user.school?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          user.role?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()),
      )
    }

    // Apply role filter
    if (selectedRole && selectedRole !== "all") {
      result = result.filter((user) => user.role === selectedRole)
    }

    // Apply school filter
    if (selectedSchool && selectedSchool !== "all") {
      result = result.filter((user) => user.school === selectedSchool)
    }

    // Apply belt filter
    if (selectedBelt && selectedBelt !== "all") {
      result = result.filter((user) => user.current_belt_id === selectedBelt)
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "full_name": {
          const aName = a.full_name || a.email
          const bName = b.full_name || b.email
          comparison = aName.localeCompare(bName, undefined, { numeric: true, sensitivity: "base" })
          break
        }
        case "created_at":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case "last_login": {
          const aLogin = a.last_login ? new Date(a.last_login).getTime() : 0
          const bLogin = b.last_login ? new Date(b.last_login).getTime() : 0
          comparison = aLogin - bLogin
          break
        }
        case "login_count":
          comparison = a.login_count - b.login_count
          break
        case "last_view": {
          const aView = a.last_view ? new Date(a.last_view).getTime() : 0
          const bView = b.last_view ? new Date(b.last_view).getTime() : 0
          comparison = aView - bView
          break
        }
        case "view_count":
          comparison = a.view_count - b.view_count
          break
      }

      if (comparison === 0 && sortBy !== "full_name") {
        const aName = a.full_name || a.email
        const bName = b.full_name || b.email
        comparison = aName.localeCompare(bName, undefined, { numeric: true, sensitivity: "base" })
      }

      return sortOrder === "asc" ? comparison : -comparison
    })

    return result
  }, [users, debouncedSearchQuery, selectedRole, selectedSchool, selectedBelt, sortBy, sortOrder])

  useEffect(() => {
    setFilteredUsers(processedUsers)
  }, [processedUsers])

  const reconstructURL = (
    role: string,
    school: string,
    search: string,
    belt: string,
    sortBy: string,
    sortOrder: "asc" | "desc",
  ) => {
    const params = new URLSearchParams()

    if (role.trim() && role !== "all") {
      params.set("role", role)
    }

    if (school.trim() && school !== "all") {
      params.set("school", school)
    }

    if (search.trim()) {
      params.set("search", search)
    }

    if (belt.trim() && belt !== "all") {
      params.set("belt", belt)
    }

    params.set("sortBy", sortBy)
    params.set("sortOrder", sortOrder)

    const currentPath = "/students"
    const newURL = params.toString() ? `${currentPath}?${params.toString()}` : currentPath
    router.replace(newURL, { scroll: false })
  }

  const handleRoleChange = (role: string) => {
    setSelectedRole(role)
    reconstructURL(role, selectedSchool, searchQuery, selectedBelt, sortBy, sortOrder)
  }

  const handleSchoolChange = (school: string) => {
    setSelectedSchool(school)
    reconstructURL(selectedRole, school, searchQuery, selectedBelt, sortBy, sortOrder)
  }

  const handleBeltChange = (belt: string) => {
    setSelectedBelt(belt)
    reconstructURL(selectedRole, selectedSchool, searchQuery, belt, sortBy, sortOrder)
  }

  const handleSortChange = (newSortBy: string, newSortOrder: "asc" | "desc") => {
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)

    localStorage.setItem(`${storagePrefix}SortBy`, newSortBy)
    localStorage.setItem(`${storagePrefix}SortOrder`, newSortOrder)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      reconstructURL(selectedRole, selectedSchool, searchQuery, selectedBelt, sortBy, sortOrder)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, selectedRole, selectedSchool, selectedBelt, sortBy, sortOrder])

  useEffect(() => {
    fetchStudents()
    fetchCurriculums()
  }, [])

  const fetchStudents = async () => {
    try {
      const result = await fetchStudentsForHeadTeacher(headTeacherSchool, headTeacherId)

      if (result.error) {
        console.error("Error fetching students:", result.error)
        setUsers([])
      } else {
        setUsers(result.data)
      }
    } catch (error) {
      console.error("Error fetching students:", error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCurriculums = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { data, error } = await supabase
      .from("curriculums")
      .select("id, name, color, display_order")
      .order("display_order", { ascending: true })

    if (error) {
      console.error("Error fetching curriculums:", error)
    } else {
      setCurriculums(data || [])
    }
  }

  const deleteUser = async (userId: string, userEmail: string) => {
    const confirmDelete = globalThis.confirm(
      `Are you sure you want to permanently delete the user "${userEmail}"? This will remove both their account and database record. This action cannot be undone.`,
    )

    if (!confirmDelete) return

    setProcessingUsers((prev) => new Set(prev).add(userId))

    try {
      const result = await deleteUserCompletely(userId, userEmail)

      if (!result.success) {
        throw new Error(result.error || "Failed to delete user")
      }

      setUsers((prev) => prev.filter((user) => user.id !== userId))
      toast.success("User deleted successfully")
    } catch (error) {
      console.error("Error deleting user:", error)
      toast.error("Failed to delete user. Please try again.")
    } finally {
      setProcessingUsers((prev) => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    setProcessingUsers((prev) => new Set(prev).add(userId))

    try {
      const supabase = createBrowserClient()
      const { error } = await supabase.from("users").update({ role: newRole }).eq("id", userId)

      if (error) throw error

      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role: newRole } : user)))
      toast.success("User role updated successfully")
    } catch (error) {
      console.error("Error updating user role:", error)
      toast.error("Failed to update user role. Please try again.")
    } finally {
      setProcessingUsers((prev) => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const updateUserBelt = async (userId: string, newBeltId: string | null) => {
    setProcessingUsers((prev) => new Set(prev).add(userId))

    try {
      const supabase = createBrowserClient()
      const { error } = await supabase
        .from("users")
        .update({ current_belt_id: newBeltId || null })
        .eq("id", userId)

      if (error) throw error

      // Fetch the updated user with belt data to maintain the curriculum information
      const { data: updatedUser, error: fetchError } = await supabase
        .from("users")
        .select("*, current_belt:curriculums!current_belt_id(id, name, color, display_order)")
        .eq("id", userId)
        .single()

      if (fetchError) throw fetchError

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                current_belt_id: newBeltId,
                current_belt: updatedUser.current_belt || null,
              }
            : user,
        ),
      )
      toast.success("User belt updated successfully")
    } catch (error) {
      console.error("Error updating user belt:", error)
      toast.error("Failed to update user belt. Please try again.")
    } finally {
      setProcessingUsers((prev) => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const startEditing = (user: UserInterface) => {
    setEditingUser(user.id)
    setEditValues({
      full_name: user.full_name || "",
      teacher: user.teacher || "",
      school: user.school || "",
      current_belt_id: user.current_belt_id,
    })
  }

  const cancelEditing = () => {
    setEditingUser(null)
    setEditValues({
      full_name: "",
      teacher: "",
      school: "",
      current_belt_id: null,
    })
  }

  const saveEditing = async () => {
    if (!editingUser) return

    setProcessingUsers((prev) => new Set(prev).add(editingUser))

    try {
      const result = await updateUserFields(
        editingUser,
        editValues.full_name,
        editValues.teacher,
        editValues.school,
        editValues.current_belt_id,
      )

      if (result.error) {
        throw new Error(result.error)
      }

      setUsers((prev) =>
        prev.map((user) =>
          user.id === editingUser
            ? {
                ...user,
                full_name: editValues.full_name.trim(),
                teacher: editValues.teacher.trim(),
                school: editValues.school.trim(),
                current_belt_id: editValues.current_belt_id,
              }
            : user,
        ),
      )

      setEditingUser(null)
      setEditValues({
        full_name: "",
        teacher: "",
        school: "",
        current_belt_id: null,
      })
      toast.success("User details updated successfully")
    } catch (error) {
      console.error("Error updating user fields:", error)
      toast.error("Failed to update user fields. Please try again.")
    } finally {
      setProcessingUsers((prev) => {
        const newSet = new Set(prev)
        newSet.delete(editingUser)
        return newSet
      })
    }
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    }
    return email[0].toUpperCase()
  }

  if (loading) {
    return (
      <Card className="bg-black/60 border-gray-800">
        <div className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-red-500" />
            <span className="ml-2 text-gray-300">Loading students...</span>
          </div>
        </div>
      </Card>
    )
  }

  if (users.length === 0) {
    return (
      <Card className="bg-black/60 border-gray-800">
        <div className="p-8">
          <div className="text-center">
            <p className="text-gray-400 text-lg">No students found for your school.</p>
            <p className="text-gray-500 text-sm mt-2">
              Students with school names starting with "{headTeacherSchool}" will appear here.
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                onClick={() => setIsInviteModalOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white"
                size="default"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite User
              </Button>
            </div>
          </div>
        </div>
        <InviteUserModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
      </Card>
    )
  }

  return (
    <Card className="bg-black/60 border-gray-800">
      <div className="px-6 py-3 pt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold text-white flex-shrink-0">Students ({users.length})</h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-400 focus:border-red-500"
              />
            </div>
            <Button
              onClick={() => setIsInviteModalOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0"
              size="sm"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite User
            </Button>
          </div>
        </div>

        <div>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="lg:hidden">
              <Dialog open={showMobileFilters} onOpenChange={setShowMobileFilters}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-black/50 border-gray-700 text-white hover:bg-gray-700 hover:text-white"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                    {((selectedRole && selectedRole !== "all") ||
                      (selectedSchool && selectedSchool !== "all") ||
                      (selectedBelt && selectedBelt !== "all")) && (
                      <span className="ml-2 bg-red-600 text-white text-xs rounded-full px-2 py-0.5">
                        {
                          [
                            selectedRole !== "all" && selectedRole,
                            selectedSchool !== "all" && selectedSchool,
                            selectedBelt !== "all" && selectedBelt,
                          ].filter(Boolean).length
                        }
                      </span>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-sm max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-white">Filter Students</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <UserFilter
                      roles={processedData.roles}
                      schools={processedData.schools}
                      belts={curriculums}
                      selectedRole={selectedRole}
                      selectedSchool={selectedSchool}
                      selectedBelt={selectedBelt}
                      onRoleChange={handleRoleChange}
                      onSchoolChange={handleSchoolChange}
                      onBeltChange={handleBeltChange}
                      userCount={filteredUsers.length}
                    />
                    <Button
                      onClick={() => setShowMobileFilters(false)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                    >
                      Apply Filters
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="hidden lg:flex lg:items-start lg:justify-between lg:w-full">
              <div className="flex-1">
                <UserFilter
                  roles={processedData.roles}
                  schools={processedData.schools}
                  belts={curriculums}
                  selectedRole={selectedRole}
                  selectedSchool={selectedSchool}
                  selectedBelt={selectedBelt}
                  onRoleChange={handleRoleChange}
                  onSchoolChange={handleSchoolChange}
                  onBeltChange={handleBeltChange}
                  userCount={filteredUsers.length}
                />
              </div>
              <div className="ml-6 flex-shrink-0">
                <UserSortControl sortBy={sortBy} sortOrder={sortOrder} onSortChange={handleSortChange} />
              </div>
            </div>

            <div className="lg:hidden">
              <UserSortControl sortBy={sortBy} sortOrder={sortOrder} onSortChange={handleSortChange} />
            </div>
          </div>
        </div>
        <div className="space-y-3 mt-4">
          {filteredUsers.map((student) => {
            const isProcessing = processingUsers.has(student.id)
            const isEditing = editingUser === student.id

            let roleBadgeClass: string
            if (student.role === "Admin") {
              roleBadgeClass = "bg-red-600 text-white"
            } else if (student.role === "Teacher") {
              roleBadgeClass = "bg-purple-600 text-white"
            } else if (student.role === "Head Teacher") {
              roleBadgeClass = "bg-teal-600 text-white"
            } else {
              roleBadgeClass = "bg-gray-600 text-white"
            }

            return (
              <div
                key={student.id}
                className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700 gap-3"
              >
                <div className="flex items-start sm:items-center space-x-4 flex-1 min-w-0">
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarImage
                      src={student.profile_image_url || "/placeholder.svg"}
                      alt={student.full_name || student.email}
                    />
                    <AvatarFallback className="bg-red-600 text-white flex-shrink-0">
                      {getInitials(student.full_name, student.email)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {isEditing ? (
                        <Input
                          value={editValues.full_name}
                          onChange={(e) => setEditValues({ ...editValues, full_name: e.target.value })}
                          className="h-6 text-sm bg-gray-800 border-gray-600 text-white max-w-48"
                          placeholder="Full name"
                        />
                      ) : (
                        <h4 className="font-medium text-white truncate">{student.full_name || "No name provided"}</h4>
                      )}
                      <Badge variant="default" className={roleBadgeClass}>
                        {student.role || "Student"}
                      </Badge>

                      <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded flex-shrink-0">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span>{student.last_login ? formatDate(student.last_login) : "Never"}</span>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded flex-shrink-0">
                        <LogIn className="w-3 h-3 flex-shrink-0" />
                        <span>
                          {student.login_count} login{student.login_count !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded flex-shrink-0">
                        <Play className="w-3 h-3 flex-shrink-0" />
                        <span>{student.last_view ? formatDate(student.last_view) : "Never"}</span>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded flex-shrink-0">
                        <Eye className="w-3 h-3 flex-shrink-0" />
                        <span>
                          {student.view_count} view{student.view_count !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-400">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1 min-w-0">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{student.email}</span>
                        </div>
                        <div className="flex items-center space-x-1 min-w-0">
                          {isEditing ? (
                            <Input
                              value={editValues.teacher}
                              onChange={(e) => setEditValues({ ...editValues, teacher: e.target.value })}
                              className="h-5 text-xs bg-gray-800 border-gray-600 text-white"
                              placeholder="Teacher name"
                            />
                          ) : (
                            <>
                              <GraduationCap className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{student.teacher || "Not specified"}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 min-w-0">
                          {isEditing ? (
                            <Input
                              value={editValues.school}
                              onChange={(e) => setEditValues({ ...editValues, school: e.target.value })}
                              className="h-5 text-xs bg-gray-800 border-gray-600 text-white"
                              placeholder="School name"
                            />
                          ) : (
                            <>
                              <Building className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{student.school || "Not specified"}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center space-x-1 min-w-0">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <span>Join: {formatDate(student.created_at)}</span>
                        </div>
                        {student.approved_at && (
                          <div className="flex items-center space-x-1 min-w-0">
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            <span>Appr: {formatDate(student.approved_at)}</span>
                          </div>
                        )}
                        {student.inviter?.full_name && (
                          <div className="flex items-center space-x-1 min-w-0">
                            <User className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">Inv: {student.inviter.full_name}</span>
                          </div>
                        )}
                        {!student.inviter && student.is_approved && (
                          <div className="flex items-center space-x-1 min-w-0 text-gray-500">
                            <User className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">Inv: Direct</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 w-32 md:ml-4">
                    <div className="flex flex-col gap-1 w-full">
                      {userRole === "Head Teacher" && (
                        <select
                          value={isEditing ? editValues.role || "Student" : student.role || "Student"}
                          onChange={(e) => updateUserRole(student.id, e.target.value)}
                          disabled={isProcessing || isEditing}
                          className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs focus:border-red-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="Student">Student</option>
                          <option value="Teacher">Teacher</option>
                          <option value="Head Teacher">Head Teacher</option>
                          <option value="Admin">Admin</option>
                        </select>
                      )}

                      <select
                        value={isEditing ? editValues.current_belt_id || "" : student.current_belt_id || ""}
                        onChange={(e) => {
                          if (isEditing) {
                            setEditValues({
                              ...editValues,
                              current_belt_id: e.target.value || null,
                            })
                          } else {
                            updateUserBelt(student.id, e.target.value || null)
                          }
                        }}
                        disabled={isProcessing}
                        className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs focus:border-red-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">No belt</option>
                        {curriculums.map((curriculum) => (
                          <option key={curriculum.id} value={curriculum.id}>
                            {curriculum.name}
                          </option>
                        ))}
                      </select>

                      <div className="flex gap-1">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              onClick={saveEditing}
                              disabled={isProcessing}
                              className="bg-green-600 hover:bg-green-700 text-white p-1 h-6 w-6"
                              aria-label="Save changes"
                            >
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditing}
                              disabled={isProcessing}
                              className="border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white p-1 h-6 w-6 bg-transparent"
                              aria-label="Cancel editing"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            {userRole === "Head Teacher" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditing(student)}
                                disabled={isProcessing}
                                className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white p-1 h-6 w-6"
                                aria-label="Edit user"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            )}
                            {userRole === "Head Teacher" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteUser(student.id, student.email)}
                                disabled={isProcessing}
                                className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white p-1 h-6 w-6"
                                aria-label="Delete user"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {filteredUsers.length === 0 && users.length > 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400">No students found matching your criteria.</p>
          </div>
        )}
      </div>
      <InviteUserModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
    </Card>
  )
}
