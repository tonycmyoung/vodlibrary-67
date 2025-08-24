"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, UserCheck, UserX, Mail, Calendar, Loader2, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { deleteUserCompletely } from "@/lib/actions"
import { formatDate } from "@/lib/utils/date"

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
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserInterface[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserInterface[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchQuery])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, full_name, teacher, school, role, created_at, is_approved, approved_at, profile_image_url")
        .order("created_at", { ascending: false })

      if (error) throw error

      setUsers(data || [])
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    if (!searchQuery) {
      setFilteredUsers(users)
      return
    }

    const filtered = users.filter(
      (user) =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.teacher?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.school?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    setFilteredUsers(filtered)
  }

  const toggleUserApproval = async (userId: string, currentStatus: boolean) => {
    setProcessingUsers((prev) => new Set(prev).add(userId))

    try {
      const updateData = {
        is_approved: !currentStatus,
        approved_at: !currentStatus ? new Date().toISOString() : null,
      }

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
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            <span className="ml-2 text-gray-300">Loading users...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-black/60 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span>All Users ({users.length})</span>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-400 focus:border-purple-500"
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredUsers.map((user) => {
            const isProcessing = processingUsers.has(user.id)
            const isAdmin = user.email === "acmyma@gmail.com"

            return (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700 leading-5 py-0.5"
              >
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={user.profile_image_url || "/placeholder.svg"}
                      alt={user.full_name || user.email}
                    />
                    <AvatarFallback className="bg-purple-600 text-white">
                      {getInitials(user.full_name, user.email)}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-white">{user.full_name || "No name provided"}</h4>
                      {isAdmin ? (
                        <Badge className="bg-purple-600 text-white">Administrator</Badge>
                      ) : (
                        <>
                          <Badge
                            variant={user.is_approved ? "default" : "outline"}
                            className={
                              user.is_approved
                                ? "bg-green-600 text-white"
                                : "border-yellow-600 text-yellow-400 bg-transparent"
                            }
                          >
                            {user.is_approved ? "Approved" : "Pending"}
                          </Badge>
                          <Badge
                            className={user.role === "Teacher" ? "bg-blue-600 text-white" : "bg-gray-600 text-white"}
                          >
                            {user.role || "Student"}
                          </Badge>
                        </>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Mail className="w-3 h-3" />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>Teacher: {user.teacher || "Not specified"}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>School: {user.school || "Not specified"}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>Joined {formatDate(user.created_at)}</span>
                      </div>
                      {user.approved_at && (
                        <div className="flex items-center space-x-1">
                          <UserCheck className="w-3 h-3" />
                          <span>Approved {formatDate(user.approved_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {!isAdmin && (
                    <>
                      <select
                        value={user.role || "Student"}
                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                        disabled={isProcessing}
                        className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:border-purple-500 focus:outline-none"
                      >
                        <option value="Student">Student</option>
                        <option value="Teacher">Teacher</option>
                      </select>

                      <Button
                        size="sm"
                        variant={user.is_approved ? "outline" : "default"}
                        onClick={() => toggleUserApproval(user.id, user.is_approved)}
                        disabled={isProcessing}
                        className={
                          user.is_approved
                            ? "border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                            : "bg-green-600 hover:bg-green-700 text-white"
                        }
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : user.is_approved ? (
                          <>
                            <UserX className="w-4 h-4 mr-1" />
                            Revoke
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteUser(user.id, user.email)}
                        disabled={isProcessing}
                        className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )
          })}

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400">No users found matching your search.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
