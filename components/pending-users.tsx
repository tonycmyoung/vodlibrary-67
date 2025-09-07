"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Check, X, Mail, Calendar, Loader2, User, GraduationCap } from "lucide-react"
import { approveUser, rejectUser, fetchPendingUsers } from "@/lib/actions"
import { formatDate } from "@/lib/utils/date"

interface PendingUser {
  id: string
  email: string
  full_name: string | null
  teacher: string | null
  school: string | null
  created_at: string
}

export default function PendingUsers() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set())

  const fetchPendingUsersData = async () => {
    try {
      const result = await fetchPendingUsers()

      if (result.error) {
        console.error("Error fetching pending users:", result.error)
        return
      }

      setPendingUsers(result.data || [])
    } catch (error) {
      console.error("Error fetching pending users:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingUsersData()
  }, [])

  const handleApproveUser = async (userId: string) => {
    setProcessingUsers((prev) => new Set(prev).add(userId))

    try {
      const result = await approveUser(userId)

      if (result.error) {
        console.error("Error approving user:", result.error)
        return
      }

      // Remove user from pending list
      setPendingUsers((prev) => prev.filter((user) => user.id !== userId))
    } catch (error) {
      console.error("Error approving user:", error)
    } finally {
      setProcessingUsers((prev) => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const handleRejectUser = async (userId: string) => {
    setProcessingUsers((prev) => new Set(prev).add(userId))

    try {
      const result = await rejectUser(userId)

      if (result.error) {
        console.error("Error rejecting user:", result.error)
        return
      }

      // Remove user from pending list
      setPendingUsers((prev) => prev.filter((user) => user.id !== userId))
    } catch (error) {
      console.error("Error rejecting user:", error)
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
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Check className="w-5 h-5" />
            <span>Pending User Approvals</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            <span className="ml-2 text-gray-300">Loading pending users...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-black/60 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Check className="w-5 h-5" />
            <span>Pending User Approvals</span>
          </div>
          <Badge variant="outline" className="border-yellow-600 text-yellow-400">
            {pendingUsers.length} pending
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingUsers.length === 0 ? (
          <div className="text-center leading-5 py-1.5">
            <p className="text-gray-400">No pending user approvals</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingUsers.map((user) => {
              const isProcessing = processingUsers.has(user.id)
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-gray-700 gap-2 sm:gap-4"
                >
                  <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                      <AvatarImage src="/placeholder.svg" alt={user.full_name || user.email} />
                      <AvatarFallback className="bg-purple-600 text-white text-xs sm:text-sm">
                        {getInitials(user.full_name, user.email)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-white truncate text-sm sm:text-base">
                        {user.full_name || "No name provided"}
                      </h4>
                      <div className="flex flex-col space-y-1 text-xs sm:text-sm text-gray-400">
                        <div className="flex items-center space-x-1 min-w-0">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(user.created_at)}</span>
                        </div>
                        <div className="flex items-center space-x-1 min-w-0">
                          <User className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">Teacher: {user.teacher || "Not specified"}</span>
                        </div>
                        <div className="flex items-center space-x-1 min-w-0">
                          <GraduationCap className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">School: {user.school || "Not specified"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectUser(user.id)}
                      disabled={isProcessing}
                      className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white h-8 w-8 sm:h-9 sm:w-auto sm:px-3 p-0 sm:p-2"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                      ) : (
                        <X className="w-3 h-3 sm:w-4 sm:h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApproveUser(user.id)}
                      disabled={isProcessing}
                      className="bg-green-600 hover:bg-green-700 text-white h-8 w-8 sm:h-9 sm:w-auto sm:px-3 p-0 sm:p-2"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
