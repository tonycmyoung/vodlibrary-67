"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Mail, Calendar, Loader2, User, GraduationCap, MailX } from "lucide-react"
import { fetchUnconfirmedEmailUsers } from "@/lib/actions"
import { formatDate } from "@/lib/utils/date"

interface UnconfirmedUser {
  id: string
  email: string
  full_name: string | null
  teacher: string | null
  school: string | null
  created_at: string
}

export default function UnconfirmedEmailUsers() {
  const [unconfirmedUsers, setUnconfirmedUsers] = useState<UnconfirmedUser[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUnconfirmedUsersData = async () => {
    try {
      const result = await fetchUnconfirmedEmailUsers()

      if (result.error) {
        console.error("Error fetching unconfirmed email users:", result.error)
        return
      }

      setUnconfirmedUsers(result.data || [])
    } catch (error) {
      console.error("Error fetching unconfirmed email users:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUnconfirmedUsersData()
  }, [])

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
            <MailX className="w-5 h-5" />
            <span>Unconfirmed Email Users</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            <span className="ml-2 text-gray-300">Loading unconfirmed users...</span>
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
            <MailX className="w-5 h-5" />
            <span>Unconfirmed Email Users</span>
          </div>
          <Badge variant="outline" className="border-orange-600 text-orange-400">
            {unconfirmedUsers.length} unconfirmed
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {unconfirmedUsers.length === 0 ? (
          <div className="text-center leading-5 py-1.5">
            <p className="text-gray-400">No users with unconfirmed emails</p>
          </div>
        ) : (
          <div className="space-y-4">
            {unconfirmedUsers.map((user) => (
              <div
                key={user.id}
                className="p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-gray-700 lg:grid lg:grid-cols-[auto_1fr_auto] lg:gap-6 lg:items-center"
              >
                <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1 lg:flex-none">
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                    <AvatarImage src="/placeholder.svg" alt={user.full_name || user.email} />
                    <AvatarFallback className="bg-orange-600 text-white text-xs sm:text-sm">
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
                      <div className="flex items-center space-x-1 min-w-0 lg:hidden">
                        <User className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">Teacher: {user.teacher || "Not specified"}</span>
                      </div>
                      <div className="flex items-center space-x-1 min-w-0 lg:hidden">
                        <GraduationCap className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">School: {user.school || "Not specified"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hidden lg:flex lg:flex-col lg:space-y-2 lg:min-w-0">
                  <div className="flex items-center space-x-2 min-w-0">
                    <User className="w-4 h-4 flex-shrink-0 text-gray-400" />
                    <span className="text-sm text-gray-300 truncate">{user.teacher || "No teacher specified"}</span>
                  </div>
                  <div className="flex items-center space-x-2 min-w-0">
                    <GraduationCap className="w-4 h-4 flex-shrink-0 text-gray-400" />
                    <span className="text-sm text-gray-300 truncate">{user.school || "No school specified"}</span>
                  </div>
                </div>

                <div className="flex items-center flex-shrink-0 mt-3 lg:mt-0 justify-end lg:justify-start">
                  <Badge variant="outline" className="border-orange-600 text-orange-400 text-xs">
                    Email Pending
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
