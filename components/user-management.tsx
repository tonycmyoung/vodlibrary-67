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
  Filter,
  Edit2,
  Save,
  X,
  GraduationCap,
  Building,
  Eye,
  Play,
  User,
  Key,
  Award,
  EyeOff,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { deleteUserCompletely, updateUserFields, adminResetUserPassword } from "@/lib/actions"
import { formatDate } from "@/lib/utils/date"
import UserSortControl from "@/components/user-sort-control"
import UserFilter from "@/components/user-filter"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Curriculum {
  id: string
  name: string
  color: string
  display_order: number
}

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
  inviter?: { full_name: string } | null
  current_belt_id: string | null
  current_belt?: Curriculum | null
}

// Helper to get role badge class - extracted to reduce cognitive complexity
const getRoleBadgeClass = (role: string | null): string => {
  switch (role) {
    case "Admin":
      return "bg-red-600 text-white flex-shrink-0"
    case "Teacher":
      return "bg-purple-600 text-white flex-shrink-0"
    case "Head Teacher":
      return "bg-teal-600 text-white flex-shrink-0"
    default:
      return "bg-gray-600 text-white flex-shrink-0"
  }
}

// Helper to get initials - extracted to reduce cognitive complexity
const getInitials = (name: string | null, email: string): string => {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }
  return email[0].toUpperCase()
}

// Helper to count active filters - extracted to reduce cognitive complexity
const countActiveFilters = (role: string, school: string, belt: string): number => {
  return [role !== "all" && role, school !== "all" && school, belt !== "all" && belt].filter(Boolean).length
}

// Helper to check if any filter is active
const hasActiveFilters = (role: string, school: string, belt: string): boolean => {
  return (role && role !== "all") || (school && school !== "all") || (belt && belt !== "all")
}

// Helper to build updated user with new belt - extracted to reduce nesting
const buildUserWithNewBelt = (
  user: UserInterface,
  newBeltId: string | null,
  curriculums: Curriculum[],
): UserInterface => {
  const newBelt = newBeltId ? curriculums.find((c) => c.id === newBeltId) : null
  return {
    ...user,
    current_belt_id: newBeltId,
    current_belt: newBelt ?? undefined,
  }
}

// User stats badges component - extracted to reduce cognitive complexity
const UserStatsBadges = ({ user }: { user: UserInterface }) => (
  <>
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
    <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded flex-shrink-0">
      <Play className="w-3 h-3 flex-shrink-0" />
      <span>{user.last_view ? formatDate(user.last_view) : "Never"}</span>
    </div>
    <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded flex-shrink-0">
      <Eye className="w-3 h-3 flex-shrink-0" />
      <span>
        {user.view_count} view{user.view_count !== 1 ? "s" : ""}
      </span>
    </div>
  </>
)

// User approval badge component - extracted to reduce cognitive complexity
const ApprovalBadge = ({ isApproved }: { isApproved: boolean }) => (
  <Badge
    variant={isApproved ? "default" : "outline"}
    className={
      isApproved
        ? "bg-green-600 text-white flex-shrink-0"
        : "border-yellow-600 text-yellow-400 bg-transparent flex-shrink-0"
    }
  >
    {isApproved ? "Approved" : "Pending"}
  </Badge>
)

// User dates info component - extracted to reduce cognitive complexity
const UserDatesInfo = ({ user }: { user: UserInterface }) => (
  <div className="space-y-1">
    <div className="flex items-center space-x-1 min-w-0">
      <Calendar className="w-3 h-3 flex-shrink-0" />
      <span>J: {formatDate(user.created_at)}</span>
    </div>
    {user.approved_at && (
      <div className="flex items-center space-x-1 min-w-0">
        <Calendar className="w-3 h-3 flex-shrink-0" />
        <span>A: {formatDate(user.approved_at)}</span>
      </div>
    )}
    {user.inviter?.full_name && (
      <div className="flex items-center space-x-1 min-w-0">
        <User className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">I: {user.inviter.full_name}</span>
      </div>
    )}
    {!user.inviter && user.is_approved && (
      <div className="flex items-center space-x-1 min-w-0 text-gray-500">
        <User className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">I: Direct</span>
      </div>
    )}
  </div>
)

type UserSortBy = "full_name" | "created_at" | "last_login" | "login_count" | "last_view" | "view_count"

// User info display component - shows email, teacher, school fields (edit mode vs view mode)
const UserInfoFields = ({
  user,
  isEditing,
  editValues,
  setEditValues,
  curriculums,
}: {
  user: UserInterface
  isEditing: boolean
  editValues: { full_name: string; teacher: string; school: string; current_belt_id: string | null }
  setEditValues: React.Dispatch<
    React.SetStateAction<{ full_name: string; teacher: string; school: string; current_belt_id: string | null }>
  >
  curriculums: Curriculum[]
}) => (
  <div className="space-y-1">
    <div className="flex items-center space-x-1 min-w-0">
      <Mail className="w-3 h-3 flex-shrink-0" />
      <span className="truncate">{user.email}</span>
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
          <span className="truncate">{user.teacher || "Not specified"}</span>
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
          <span className="truncate">{user.school || "Not specified"}</span>
        </>
      )}
    </div>
    {isEditing && (
      <div className="flex items-center space-x-1 min-w-0">
        <Award className="w-3 h-3 flex-shrink-0" />
        <Select
          value={editValues.current_belt_id || "none"}
          onValueChange={(value) => setEditValues({ ...editValues, current_belt_id: value === "none" ? null : value })}
        >
          <SelectTrigger className="h-5 text-xs bg-gray-800 border-gray-600 text-white">
            <SelectValue placeholder="Belt" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="none" className="text-white text-xs">
              No Belt
            </SelectItem>
            {curriculums.map((curriculum) => (
              <SelectItem key={curriculum.id} value={curriculum.id} className="text-white text-xs">
                <span className="flex items-center">
                  <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: curriculum.color }} />
                  {curriculum.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )}
  </div>
)

// User action buttons component - extracted to reduce cognitive complexity
interface UserActionButtonsProps {
  user: UserInterface
  isEditing: boolean
  isProcessing: boolean
  resetPasswordUser: string | null
  newPassword: string
  showPassword: boolean
  resetPasswordError: string
  curriculums: Curriculum[]
  setResetPasswordUser: (id: string | null) => void
  setNewPassword: (password: string) => void
  setShowPassword: (show: boolean) => void
  setResetPasswordError: (error: string) => void
  startEditing: (user: UserInterface) => void
  saveEditing: () => void
  cancelEditing: () => void
  updateUserRole: (userId: string, role: string) => void
  updateUserBelt: (userId: string, beltId: string | null) => void
  toggleUserApproval: (userId: string, currentStatus: boolean) => void
  deleteUser: (userId: string, email: string) => void
  generateRandomPassword: () => void
  handleResetPassword: () => void
}

const UserActionButtons = ({
  user,
  isEditing,
  isProcessing,
  resetPasswordUser,
  newPassword,
  showPassword,
  resetPasswordError,
  curriculums,
  setResetPasswordUser,
  setNewPassword,
  setShowPassword,
  setResetPasswordError,
  startEditing,
  saveEditing,
  cancelEditing,
  updateUserRole,
  updateUserBelt,
  toggleUserApproval,
  deleteUser,
  generateRandomPassword,
  handleResetPassword,
}: UserActionButtonsProps) => (
  <div className="flex flex-shrink-0 w-32 md:ml-4">
    <div className="flex flex-col gap-1 w-full">
      <select
        value={user.role || "Student"}
        onChange={(e) => updateUserRole(user.id, e.target.value)}
        disabled={isProcessing || isEditing}
        className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs focus:border-purple-500 focus:outline-none"
      >
        <option value="Student">Student</option>
        <option value="Teacher">Teacher</option>
        <option value="Head Teacher">Head Teacher</option>
      </select>

      <select
        value={user.current_belt_id || ""}
        onChange={(e) => updateUserBelt(user.id, e.target.value || null)}
        disabled={isProcessing || isEditing}
        className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs focus:border-purple-500 focus:outline-none"
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => startEditing(user)}
              disabled={isProcessing}
              className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white p-1 h-6 w-6"
              aria-label="Edit user"
            >
              <Edit2 className="w-3 h-3" />
            </Button>
            <Dialog
              open={resetPasswordUser === user.id}
              onOpenChange={(open) => {
                if (!open) {
                  setResetPasswordUser(null)
                  setNewPassword("")
                  setShowPassword(false)
                  setResetPasswordError("")
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setResetPasswordUser(user.id)}
                  disabled={isProcessing}
                  className="border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white p-1 h-6 w-6"
                  aria-label="Reset password"
                >
                  <Key className="w-3 h-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-700 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">Reset Password for {user.full_name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-4">
                      Set a new password for <span className="font-medium text-white">{user.email}</span>
                    </p>
                    <div className="space-y-2">
                      <label htmlFor="new-password" className="text-sm text-gray-300">
                        New Password
                      </label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value)
                            setResetPasswordError("")
                          }}
                          placeholder="Enter new password"
                          className="bg-gray-800 border-gray-600 text-white pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-400">Minimum 8 characters</p>
                    </div>
                    <Button
                      onClick={generateRandomPassword}
                      variant="outline"
                      size="sm"
                      className="mt-2 border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                    >
                      Generate Random Password
                    </Button>
                  </div>
                  {resetPasswordError && (
                    <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">
                      {resetPasswordError}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleResetPassword}
                      disabled={isProcessing || !newPassword}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        "Reset Password"
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setResetPasswordUser(null)
                        setNewPassword("")
                        setShowPassword(false)
                        setResetPasswordError("")
                      }}
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              size="sm"
              variant={user.is_approved ? "outline" : "default"}
              onClick={() => toggleUserApproval(user.id, user.is_approved)}
              disabled={isProcessing}
              className={`p-1 h-6 w-6 ${
                user.is_approved
                  ? "border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
              aria-label={user.is_approved ? "Revoke approval" : "Approve user"}
            >
              {user.is_approved ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => deleteUser(user.id, user.email)}
              disabled={isProcessing}
              className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white p-1 h-6 w-6"
              aria-label="Delete user"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  </div>
)

// User row component - extracted to reduce cognitive complexity of main render
interface UserRowProps {
  user: UserInterface
  isProcessing: boolean
  isAdmin: boolean
  isEditing: boolean
  editValues: { full_name: string; teacher: string; school: string; current_belt_id: string | null }
  setEditValues: React.Dispatch<
    React.SetStateAction<{ full_name: string; teacher: string; school: string; current_belt_id: string | null }>
  >
  resetPasswordUser: string | null
  newPassword: string
  showPassword: boolean
  resetPasswordError: string
  curriculums: Curriculum[]
  setResetPasswordUser: (id: string | null) => void
  setNewPassword: (password: string) => void
  setShowPassword: (show: boolean) => void
  setResetPasswordError: (error: string) => void
  startEditing: (user: UserInterface) => void
  saveEditing: () => void
  cancelEditing: () => void
  updateUserRole: (userId: string, role: string) => void
  updateUserBelt: (userId: string, beltId: string | null) => void
  toggleUserApproval: (userId: string, currentStatus: boolean) => void
  deleteUser: (userId: string, email: string) => void
  generateRandomPassword: () => void
  handleResetPassword: () => void
}

const UserRow = ({
  user,
  isProcessing,
  isAdmin,
  isEditing,
  editValues,
  setEditValues,
  resetPasswordUser,
  newPassword,
  showPassword,
  resetPasswordError,
  curriculums,
  setResetPasswordUser,
  setNewPassword,
  setShowPassword,
  setResetPasswordError,
  startEditing,
  saveEditing,
  cancelEditing,
  updateUserRole,
  updateUserBelt,
  toggleUserApproval,
  deleteUser,
  generateRandomPassword,
  handleResetPassword,
}: UserRowProps) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700 gap-3">
    <div className="flex items-start sm:items-center space-x-4 flex-1 min-w-0">
      <Avatar className="h-12 w-12 flex-shrink-0">
        <AvatarImage src={user.profile_image_url || "/placeholder.svg"} alt={user.full_name || user.email} />
        <AvatarFallback className="bg-purple-600 text-white flex-shrink-0">
          {getInitials(user.full_name, user.email)}
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
            <h4 className="font-medium text-white truncate">{user.full_name || "No name provided"}</h4>
          )}
          {isAdmin ? (
            <Badge className="bg-purple-600 text-white flex-shrink-0">Administrator</Badge>
          ) : (
            <>
              <ApprovalBadge isApproved={user.is_approved} />
              <Badge className={getRoleBadgeClass(user.role)}>{user.role || "Student"}</Badge>
              <UserStatsBadges user={user} />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-400">
          <UserInfoFields
            user={user}
            isEditing={isEditing}
            editValues={editValues}
            setEditValues={setEditValues}
            curriculums={curriculums}
          />
          <UserDatesInfo user={user} />
        </div>
      </div>
    </div>

    {!isAdmin && (
      <UserActionButtons
        user={user}
        isEditing={isEditing}
        isProcessing={isProcessing}
        resetPasswordUser={resetPasswordUser}
        newPassword={newPassword}
        showPassword={showPassword}
        resetPasswordError={resetPasswordError}
        curriculums={curriculums}
        setResetPasswordUser={setResetPasswordUser}
        setNewPassword={setNewPassword}
        setShowPassword={setShowPassword}
        setResetPasswordError={setResetPasswordError}
        startEditing={startEditing}
        saveEditing={saveEditing}
        cancelEditing={cancelEditing}
        updateUserRole={updateUserRole}
        updateUserBelt={updateUserBelt}
        toggleUserApproval={toggleUserApproval}
        deleteUser={deleteUser}
        generateRandomPassword={generateRandomPassword}
        handleResetPassword={handleResetPassword}
      />
    )}
  </div>
)

export default function UserManagement() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const storagePrefix = "userManagement"

  const urlState = {
    role: searchParams.get("role") || "all",
    school: searchParams.get("school") || "all",
    search: searchParams.get("search") || "",
    belt: searchParams.get("belt") || "all",
  }

  const [users, setUsers] = useState<UserInterface[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserInterface[]>([])
  const [searchQuery, setSearchQuery] = useState(urlState.search)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set())

  const [curriculums, setCurriculums] = useState<
    Array<{ id: string; name: string; color: string; display_order: number }>
  >([])

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
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  const [sortBy, setSortBy] = useState<UserSortBy>(() => {
    if (typeof window !== "undefined") {
      const storageKey = `${storagePrefix}SortBy`
      return (localStorage.getItem(storageKey) as UserSortBy) || "full_name"
    }
    return "created_at"
  })

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() => {
    if (typeof window !== "undefined") {
      const storageKey = `${storagePrefix}SortOrder`
      return (localStorage.getItem(storageKey) as "asc" | "desc") || "desc"
    }
    return "desc"
  })

  const [resetPasswordUser, setResetPasswordUser] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [resetPasswordError, setResetPasswordError] = useState("")

  const processedData = useMemo(() => {
    if (!users.length) return { roles: [], schools: [] }

    const roleSet = new Set<string>()
    const schoolSet = new Set<string>()

    users.forEach((user) => {
      if (user.role?.trim()) {
        roleSet.add(user.role)
      }
      if (user.school?.trim()) {
        schoolSet.add(user.school)
      }
    })

    return {
      roles: Array.from(roleSet).sort((a, b) => a.localeCompare(b)),
      schools: Array.from(schoolSet).sort((a, b) => a.localeCompare(b)),
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
          user.role?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          user.current_belt?.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()),
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

    if (selectedBelt && selectedBelt !== "all") {
      if (selectedBelt === "none") {
        result = result.filter((user) => !user.current_belt_id)
      } else {
        result = result.filter((user) => user.current_belt_id === selectedBelt)
      }
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

      // If primary sort values are equal and we're not sorting by name, use name as secondary sort
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

  const reconstructURL = (role: string, school: string, belt: string, search: string) => {
    const params = new URLSearchParams()

    if (role.trim() && role !== "all") {
      params.set("role", role)
    }

    if (school.trim() && school !== "all") {
      params.set("school", school)
    }

    if (belt.trim() && belt !== "all") {
      params.set("belt", belt)
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
    reconstructURL(role, selectedSchool, selectedBelt, searchQuery)
  }

  const handleSchoolChange = (school: string) => {
    setSelectedSchool(school)
    reconstructURL(selectedRole, school, selectedBelt, searchQuery)
  }

  const handleBeltChange = (belt: string) => {
    setSelectedBelt(belt)
    reconstructURL(selectedRole, selectedSchool, belt, searchQuery)
  }

  const handleSortChange = (newSortBy: string, newSortOrder: "asc" | "desc") => {
    setSortBy(newSortBy as UserSortBy)
    setSortOrder(newSortOrder)

    localStorage.setItem(`${storagePrefix}SortBy`, newSortBy)
    localStorage.setItem(`${storagePrefix}SortOrder`, newSortOrder)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      reconstructURL(selectedRole, selectedSchool, selectedBelt, searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    fetchUsers()
    fetchCurriculums()
  }, [])

  const fetchCurriculums = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("curriculums")
        .select("id, name, color, display_order")
        .order("display_order", { ascending: true })

      if (error) throw error
      setCurriculums(data || [])
    } catch (error) {
      console.error("Error fetching curriculums:", error)
    }
  }

  const fetchUsers = async () => {
    try {
      const supabase = createClient()

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select(`
          id, email, full_name, teacher, school, role, created_at, is_approved, approved_at, profile_image_url,
          inviter:invited_by(full_name),
          current_belt_id,
          current_belt:curriculums!current_belt_id(id, name, color, display_order)
        `)
        .order("created_at", { ascending: false })

      if (usersError) throw usersError

      const { data: loginStats, error: loginError } = await supabase
        .from("user_logins")
        .select("user_id, login_time")
        .order("login_time", { ascending: false })

      if (loginError) throw loginError

      const { data: viewStats, error: viewError } = await supabase
        .from("user_video_views")
        .select("user_id, viewed_at")
        .order("viewed_at", { ascending: false })

      if (viewError) throw viewError

      const usersWithStats =
        usersData?.map((user) => {
          const userLogins = loginStats?.filter((login) => login.user_id === user.id) || []
          const lastLogin = userLogins.length > 0 ? userLogins[0].login_time : null
          const loginCount = userLogins.length

          const userViews = viewStats?.filter((view) => view.user_id === user.id) || []
          const lastView = userViews.length > 0 ? userViews[0].viewed_at : null
          const viewCount = userViews.length

          return {
            ...user,
            last_login: lastLogin,
            login_count: loginCount,
            last_view: lastView,
            view_count: viewCount,
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
      const { error } = await supabase.from("users").update(updateData).eq("id", userId).select()

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

  const updateUserBelt = async (userId: string, newBeltId: string | null) => {
    setProcessingUsers((prev) => new Set(prev).add(userId))

    try {
      const supabase = createClient()
      const { error } = await supabase.from("users").update({ current_belt_id: newBeltId }).eq("id", userId)

      if (error) throw error

      // Update local state using helper function to reduce nesting
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? buildUserWithNewBelt(user, newBeltId, curriculums) : user,
        ),
      )
    } catch (error) {
      console.error("Error updating user belt:", error)
      alert("Failed to update user belt. Please try again.")
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
      await fetchUsers()
    } catch (error) {
      console.error("Error updating user fields:", error)
      alert("Failed to update user fields. Please try again.")
    } finally {
      setProcessingUsers((prev) => {
        const newSet = new Set(prev)
        newSet.delete(editingUser)
        return newSet
      })
    }
  }

  const handleResetPassword = async () => {
    if (!resetPasswordUser) return

    if (newPassword.length < 8) {
      setResetPasswordError("Password must be at least 8 characters long")
      return
    }

    setProcessingUsers((prev) => new Set(prev).add(resetPasswordUser))
    setResetPasswordError("")

    try {
      const result = await adminResetUserPassword(resetPasswordUser, newPassword)

      if (result.error) {
        setResetPasswordError(result.error)
        return
      }

      setResetPasswordUser(null)
      setNewPassword("")
      setShowPassword(false)
      alert("Password reset successfully. The user can now log in with the new password.")
    } catch (error) {
      console.error("Error resetting password:", error)
      setResetPasswordError("Failed to reset password. Please try again.")
    } finally {
      setProcessingUsers((prev) => {
        const newSet = new Set(prev)
        newSet.delete(resetPasswordUser)
        return newSet
      })
    }
  }

  const generateRandomPassword = () => {
    const length = 12
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    let password = ""
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    setNewPassword(password)
    setShowPassword(true)
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
                    {hasActiveFilters(selectedRole, selectedSchool, selectedBelt) && (
                      <span className="ml-2 bg-purple-600 text-white text-xs rounded-full px-2 py-0.5">
                        {countActiveFilters(selectedRole, selectedSchool, selectedBelt)}
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
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
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
          {filteredUsers.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              isProcessing={processingUsers.has(user.id)}
              isAdmin={user.email === "acmyma@gmail.com"}
              isEditing={editingUser === user.id}
              editValues={editValues}
              setEditValues={setEditValues}
              resetPasswordUser={resetPasswordUser}
              newPassword={newPassword}
              showPassword={showPassword}
              resetPasswordError={resetPasswordError}
              curriculums={curriculums}
              setResetPasswordUser={setResetPasswordUser}
              setNewPassword={setNewPassword}
              setShowPassword={setShowPassword}
              setResetPasswordError={setResetPasswordError}
              startEditing={startEditing}
              saveEditing={saveEditing}
              cancelEditing={cancelEditing}
              updateUserRole={updateUserRole}
              updateUserBelt={updateUserBelt}
              toggleUserApproval={toggleUserApproval}
              deleteUser={deleteUser}
              generateRandomPassword={generateRandomPassword}
              handleResetPassword={handleResetPassword}
            />
          ))}
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
