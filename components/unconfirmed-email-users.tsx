"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Mail, Calendar, Loader2, User, GraduationCap, MailX, Send, Clock } from "lucide-react"
import { fetchUnconfirmedEmailUsers, resendConfirmationEmail } from "@/lib/actions"
import { formatDate } from "@/lib/utils/date"

interface UnconfirmedUser {
  id: string
  email: string
  full_name: string | null
  teacher: string | null
  school: string | null
  created_at: string
  confirmation_sent_at: string | null
}

interface ResendState {
  [email: string]: {
    loading: boolean
    lastSent?: number
    message?: string
    isError?: boolean
    userId?: string
  }
}

export default function UnconfirmedEmailUsers() {
  const [unconfirmedUsers, setUnconfirmedUsers] = useState<UnconfirmedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [resendStates, setResendStates] = useState<ResendState>({})

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

    const handleRefresh = () => {
      fetchUnconfirmedUsersData()
    }

    globalThis.addEventListener("admin-refresh-unconfirmed-users", handleRefresh)

    return () => {
      globalThis.removeEventListener("admin-refresh-unconfirmed-users", handleRefresh)
    }
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

  const isDatabaseCooldown = (confirmationSentAt: string | null) => {
    if (!confirmationSentAt) return false
    const sentTime = new Date(confirmationSentAt).getTime()
    return Date.now() - sentTime < 60000 // 60 second cooldown
  }

  const getTimeSinceLastSend = (confirmationSentAt: string | null) => {
    if (!confirmationSentAt) return null
    const sentTime = new Date(confirmationSentAt).getTime()
    const diffInSeconds = Math.floor((Date.now() - sentTime) / 1000)

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m ago`
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}h ago`
    } else {
      return `${Math.floor(diffInSeconds / 86400)}d ago`
    }
  }

  const handleResendEmail = async (user: UnconfirmedUser) => {
    setResendStates((prev) => ({
      ...prev,
      [user.email]: { loading: true, userId: user.id },
    }))

    try {
      const result = await resendConfirmationEmail(user.email)

      if (result.error) {
        setResendStates((prev) => ({
          ...prev,
          [user.email]: {
            loading: false,
            message: result.error,
            isError: true,
            lastSent: Date.now(),
            userId: user.id,
          },
        }))
      } else {
        setResendStates((prev) => ({
          ...prev,
          [user.email]: {
            loading: false,
            message: "Confirmation email sent!",
            isError: false,
            lastSent: Date.now(),
            userId: user.id,
          },
        }))

        setTimeout(() => {
          fetchUnconfirmedUsersData()
        }, 1000)
      }

      // Clear message after 3 seconds
      setTimeout(() => {
        setResendStates((prev) => ({
          ...prev,
          [user.email]: {
            ...prev[user.email],
            message: undefined,
            isError: undefined,
          },
        }))
      }, 3000)
    } catch (error) {
      setResendStates((prev) => ({
        ...prev,
        [user.email]: {
          loading: false,
          message: "Failed to send email",
          isError: true,
          lastSent: Date.now(),
          userId: user.id,
        },
      }))
    }
  }

  const isOnCooldown = (user: UnconfirmedUser) => {
    // Check database cooldown first
    if (isDatabaseCooldown(user.confirmation_sent_at)) {
      return true
    }
    // Then check local state cooldown
    const lastSent = resendStates[user.email]?.lastSent
    if (!lastSent) return false
    return Date.now() - lastSent < 60000
  }

  const getCooldownTime = (user: UnconfirmedUser) => {
    // Check database cooldown first
    if (user.confirmation_sent_at && isDatabaseCooldown(user.confirmation_sent_at)) {
      const sentTime = new Date(user.confirmation_sent_at).getTime()
      return Math.max(0, 60 - Math.floor((Date.now() - sentTime) / 1000))
    }
    // Then check local state cooldown
    const lastSent = resendStates[user.email]?.lastSent
    if (!lastSent) return 0
    return Math.max(0, 60 - Math.floor((Date.now() - lastSent) / 1000))
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
            {unconfirmedUsers.map((user) => {
              const resendState = resendStates[user.email] || {}
              const onCooldown = isOnCooldown(user)
              const cooldownTime = getCooldownTime(user)
              const timeSinceLastSend = getTimeSinceLastSend(user.confirmation_sent_at)

              return (
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
                    <div className="flex flex-col items-end lg:items-start space-y-2">
                      {timeSinceLastSend && (
                        <div className="flex items-center space-x-1 lg:hidden">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-400">Last sent: {timeSinceLastSend}</span>
                        </div>
                      )}

                      {(() => {
                        if (resendState.userId === user.id) {
                          return (
                            <Badge variant="outline" className="border-gray-600 text-gray-400 text-xs">
                              {resendState.message}
                            </Badge>
                          )
                        } else if (onCooldown) {
                          return (
                            <Badge variant="outline" className="border-gray-600 text-gray-400 text-xs">
                              Resent {cooldownTime}s ago
                            </Badge>
                          )
                        } else {
                          return (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResendEmail(user)}
                              disabled={resendState.loading}
                              className="border-orange-600 text-orange-400 hover:bg-orange-600 hover:text-white text-xs"
                            >
                              {resendState.loading ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Send className="w-3 h-3 mr-1" />
                                  Resend
                                </>
                              )}
                            </Button>
                          )
                        }
                      })()}

                      {timeSinceLastSend && (
                        <div className="hidden lg:flex lg:items-center lg:space-x-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-400">Last sent: {timeSinceLastSend}</span>
                        </div>
                      )}
                    </div>
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

const getBadgeClassName = (isError?: boolean) => {
  return isError ? "border-red-600 text-red-400" : "border-green-600 text-green-400"
}
