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
  UserCheck,
  UserX,
  Mail,
  Calendar,
  Loader2,
  Trash2,
  Clock,
  LogIn,
  Shield,
  FileText,
  Filter,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { deleteUserCompletely } from "@/lib/actions"
import { formatDate } from "@/lib/utils/date"
import UserSortControl from "@/components/user-sort-control"
import UserFilter from "@/components/user-filter"

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
  eula_consent: string | null
  privacy_consent: string | null
}

export default function UserManagement() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const storagePrefix = "userManagement"

  const [urlState, setUrlState] = useState(() => {
    const role = searchParams.get("role") || "all"
    const school = searchParams.get("school") || "all"
    const search = searchParams.get("search") || ""
    return { role, school, search }
  })

  const [users, setUsers] = useState<UserInterface[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserInterface[]>([])
  const [searchQuery, setSearchQuery] = useState(urlState.search)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set())

  const [selectedRole, setSelectedRole] = useState(urlState.role)
  const [selectedSchool, setSelectedSchool] = useState(urlState.school)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  const [sortBy, setSortBy] = useState<"full_name" | "created_at" | "last_login" | "login_count">(() => {
    if (typeof window !== "undefined") {
      const storageKey = `${storagePrefix}SortBy`
      return (
        (localStorage.getItem(storageKey) as "full_name" | "created_at" | "last_login" | "login_count") || "full_name"
      )
    }
    return "full_name"
  })

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() => {
    if (typeof window !== "undefined") {
      const storageKey = `${storagePrefix}SortOrder`
      return (localStorage.getItem(storageKey) as "asc" | "desc") || "asc"
    }
    return "asc"
  })

  const processedData = useMemo(() => {
    if (!users.length) return { roles: [], schools: [] }

    const roleSet = new Set<string>()
    const schoolSet = new Set<string>()

    users.forEach((user) => {
      if (user.role && user.role.trim()) {
        roleSet.add(user.role)
      }
      if (user.school && user.school.trim()) {
        schoolSet.add(user.school)
      }
    })

    return {
      roles: Array.from(roleSet).sort(),
      schools: Array.from(schoolSet).sort(),
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

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "full_name":
          const aName = a.full_name || a.email
          const bName = b.full_name || b.email
          comparison = aName.localeCompare(bName)
          break
        case "created_at":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case "last_login":
          const aLogin = a.last_login ? new Date(a.last_login).getTime() : 0
          const bLogin = b.last_login ? new Date(b.last_login).getTime() : 0
          comparison = aLogin - bLogin
          break
        case "login_count":
          comparison = a.login_count - b.login_count
          break
      }

      // If primary sort values are equal and we're not sorting by name, use name as secondary sort
      if (comparison === 0 && sortBy !== "full_name") {
        const aName = a.full_name || a.email
        const bName = b.full_name || b.email
        comparison = aName.localeCompare(bName)
      }

      return sortOrder === "asc" ? comparison : -comparison
    })

    return result
  }, [users, debouncedSearchQuery, selectedRole, selectedSchool, sortBy, sortOrder])

  useEffect(() => {
    setFilteredUsers(processedUsers)
  }, [processedUsers])

  const reconstructURL = (role: string, school: string, search: string) => {
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

    const currentPath = "/admin/users"
    const newURL = params.toString() ? `${currentPath}?${params.toString()}` : currentPath
    router.replace(newURL, { scroll: false })
  }

  const handleRoleChange = (role: string) => {
    setSelectedRole(role)
    reconstructURL(role, selectedSchool, searchQuery)
  }

  const handleSchoolChange = (school: string) => {
    setSelectedSchool(school)
    reconstructURL(selectedRole, school, searchQuery)
  }

  const handleSortChange = (newSortBy: string, newSortOrder: "asc" | "desc") => {
    setSortBy(newSortBy as "full_name" | "created_at" | "last_login" | "login_count")
    setSortOrder(newSortOrder)

    localStorage.setItem(`${storagePrefix}SortBy`, newSortBy)
    localStorage.setItem(`${storagePrefix}SortOrder`, newSortOrder)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      reconstructURL(selectedRole, selectedSchool, searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, selectedRole, selectedSchool])

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const supabase = createClient()

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, email, full_name, teacher, school, role, created_at, is_approved, approved_at, profile_image_url")
        .order("created_at", { ascending: false })

      if (usersError) throw usersError

      const { data: loginStats, error: loginError } = await supabase
        .from("user_logins")
        .select("user_id, login_time")
        .order("login_time", { ascending: false })

      if (loginError) throw loginError

      const { data: consentData, error: consentError } = await supabase
        .from("user_consents")
        .select("user_id, eula_accepted_at, privacy_accepted_at")

      if (consentError) throw consentError

      const usersWithStats =
        usersData?.map((user) => {
          const userLogins = loginStats?.filter((login) => login.user_id === user.id) || []
          const lastLogin = userLogins.length > 0 ? userLogins[0].login_time : null
          const loginCount = userLogins.length

          const userConsent = consentData?.find((consent) => consent.user_id === user.id)

          return {
            ...user,
            last_login: lastLogin,
            login_count: loginCount,
            eula_consent: userConsent?.eula_accepted_at || null,
            privacy_consent: userConsent?.privacy_accepted_at || null,
          }
        }) || []

      setUsers(usersWithStats)
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleUserApproval = async (userId: string, currentStatus: boolean) => {
    setProcessingUsers((prev) => new Set(prev).add(userId))

    try {
      const updateData = {
        is_approved: !currentStatus,
        approved_at: !currentStatus ? new Date().toISOString() : null,
      }

      const supabase = createClient()
      const { error, data } = await supabase.from("users").update(updateData).eq("id", userId).select()

      if (error) throw error

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                is_approved: !currentStatus,
                approved_at: !currentStatus ? new Date().toISOString() : null,
              }
            : user,
        ),
      )
    } catch (error) {
      console.error("Error updating user approval:", error)
    } finally {
      setProcessingUsers((prev) => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const deleteUser = async (userId: string, userEmail: string) => {
    const confirmDelete = window.confirm(
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
    } catch (error) {
      console.error("Error deleting user:", error)
      alert("Failed to delete user. Please try again.")
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
      const supabase = createClient()
      const { error } = await supabase.from("users").update({ role: newRole }).eq("id", userId)

      if (error) throw error

      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role: newRole } : user)))
    } catch (error) {
      console.error("Error updating user role:", error)
      alert("Failed to update user role. Please try again.")
    } finally {
      setProcessingUsers((prev) => {
        const newSet = new Set(prev)
        newSet.delete(userId)
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
            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            <span className="ml-2 text-gray-300">Loading users...</span>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="bg-black/60 border-gray-800">
      <div className="px-6 py-3 pt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold text-white">All Users ({users.length})</h2>
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-400 focus:border-purple-500"
            />
          </div>
        </div>

        <div>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            {/* Mobile filter button - only visible on mobile */}
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
                    {((selectedRole && selectedRole !== "all") || (selectedSchool && selectedSchool !== "all")) && (
                      <span className="ml-2 bg-purple-600 text-white text-xs rounded-full px-2 py-0.5">
                        {
                          [selectedRole !== "all" && selectedRole, selectedSchool !== "all" && selectedSchool].filter(
                            Boolean,
                          ).length
                        }
                      </span>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-sm max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-white">Filter Users</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <UserFilter
                      roles={processedData.roles}
                      schools={processedData.schools}
                      selectedRole={selectedRole}
                      selectedSchool={selectedSchool}
                      onRoleChange={handleRoleChange}
                      onSchoolChange={handleSchoolChange}
                      userCount={filteredUsers.length}
                    />
                    <Button
                      onClick={() => setShowMobileFilters(false)}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Apply Filters
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Desktop filters with sort controls inline */}
            <div className="hidden lg:flex lg:items-start lg:justify-between lg:w-full">
              <div className="flex-1">
                <UserFilter
                  roles={processedData.roles}
                  schools={processedData.schools}
                  selectedRole={selectedRole}
                  selectedSchool={selectedSchool}
                  onRoleChange={handleRoleChange}
                  onSchoolChange={handleSchoolChange}
                  userCount={filteredUsers.length}
                />
              </div>
              <div className="ml-6 flex-shrink-0">
                <UserSortControl sortBy={sortBy} sortOrder={sortOrder} onSortChange={handleSortChange} />
              </div>
            </div>

            {/* Mobile sort controls - only visible on mobile */}
            <div className="lg:hidden">
              <UserSortControl sortBy={sortBy} sortOrder={sortOrder} onSortChange={handleSortChange} />
            </div>
          </div>
        </div>
        <div className="space-y-3 mt-4">
          {filteredUsers.map((user) => {
            const isProcessing = processingUsers.has(user.id)
            const isAdmin = user.email === "acmyma@gmail.com"

            return (
              <div
                key={user.id}
                className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700 gap-3"
              >
                <div className="flex items-start sm:items-center space-x-4 flex-1 min-w-0">
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarImage
                      src={user.profile_image_url || "/placeholder.svg"}
                      alt={user.full_name || user.email}
                    />
                    <AvatarFallback className="bg-purple-600 text-white flex-shrink-0">
                      {getInitials(user.full_name, user.email)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-medium text-white truncate">{user.full_name || "No name provided"}</h4>
                      {isAdmin ? (
                        <Badge className="bg-purple-600 text-white flex-shrink-0">Administrator</Badge>
                      ) : (
                        <>
                          <Badge
                            variant={user.is_approved ? "default" : "outline"}
                            className={
                              user.is_approved
                                ? "bg-green-600 text-white flex-shrink-0"
                                : "border-yellow-600 text-yellow-400 bg-transparent flex-shrink-0"
                            }
                          >
                            {user.is_approved ? "Approved" : "Pending"}
                          </Badge>
                          <Badge
                            className={
                              user.role === "Teacher"
                                ? "bg-blue-600 text-white flex-shrink-0"
                                : "bg-gray-600 text-white flex-shrink-0"
                            }
                          >
                            {user.role || "Student"}
                          </Badge>
                        </>
                      )}

                      <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded flex-shrink-0">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span>{user.last_login ? formatDate(user.last_login) : "Never"}</span>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded flex-shrink-0">
                        <LogIn className="w-3 h-3 flex-shrink-0" />
                        <span>
                          {user.login_count} login{user.login_count !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-1 text-sm text-gray-400">
                      <div className="flex items-center space-x-1 min-w-0">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      <div className="flex items-center space-x-1 min-w-0">
                        <span className="truncate">Teacher: {user.teacher || "Not specified"}</span>
                      </div>
                      <div className="flex items-center space-x-1 min-w-0">
                        <span className="truncate">School: {user.school || "Not specified"}</span>
                      </div>
                      <div className="flex items-center space-x-1 min-w-0">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span>Joined {formatDate(user.created_at)}</span>
                      </div>
                      {user.is_approved && (
                        <div className="flex items-center space-x-1 min-w-0">
                          <UserCheck className="w-3 h-3 flex-shrink-0" />
                          <span>Approved {user.approved_at ? formatDate(user.approved_at) : "Date unknown"}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {!isAdmin && (
                  <div className="flex flex-col gap-2 flex-shrink-0 w-48 md:ml-4">
                    {/* Top row: EULA/Privacy badges and role selector */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Top left: EULA/Privacy badges stacked */}
                      <div className="flex flex-col gap-1">
                        <Badge
                          className={
                            user.eula_consent
                              ? "bg-green-700 text-green-100 text-xs px-1 py-0.5"
                              : "bg-red-700 text-red-100 text-xs px-1 py-0.5"
                          }
                        >
                          <Shield className="w-3 h-3 mr-1" />
                          EULA {user.eula_consent ? "✓" : "✗"}
                        </Badge>
                        <Badge
                          className={
                            user.privacy_consent
                              ? "bg-green-700 text-green-100 text-xs px-1 py-0.5"
                              : "bg-red-700 text-red-100 text-xs px-1 py-0.5"
                          }
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          Privacy {user.privacy_consent ? "✓" : "✗"}
                        </Badge>
                      </div>

                      {/* Top right: Role selector */}
                      <select
                        value={user.role || "Student"}
                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                        disabled={isProcessing}
                        className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs focus:border-purple-500 focus:outline-none h-fit"
                      >
                        <option value="Student">Student</option>
                        <option value="Teacher">Teacher</option>
                      </select>
                    </div>

                    {/* Bottom row: Action buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant={user.is_approved ? "outline" : "default"}
                        onClick={() => toggleUserApproval(user.id, user.is_approved)}
                        disabled={isProcessing}
                        className={`px-2 py-1 text-xs ${
                          user.is_approved
                            ? "border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                            : "bg-green-600 hover:bg-green-700 text-white"
                        }`}
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : user.is_approved ? (
                          <>
                            <UserX className="w-3 h-3 mr-1" />
                            Revoke
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3 h-3 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteUser(user.id, user.email)}
                        disabled={isProcessing}
                        className="px-2 py-1 text-xs border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {filteredUsers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400">No users found matching your criteria.</p>
          </div>
        )}
      </div>
    </Card>
  )
}
