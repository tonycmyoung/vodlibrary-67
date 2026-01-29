"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, X, Check, Trash2, MessageCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { fetchNotificationsWithSenders } from "@/lib/actions"
import { formatTimeAgo } from "@/lib/utils/date"
import { useRouter } from "next/navigation"

interface Notification {
  id: string
  sender_id: string
  message: string
  is_read: boolean
  created_at: string
  sender: {
    full_name: string | null
    email: string
    profile_image_url: string | null // Added profile_image_url to interface
  } | null
}

interface NotificationBellProps {
  userId: string
  isAdmin?: boolean
  userRole?: string | null
  userEmail?: string
}

export default function NotificationBell({ userId, isAdmin = false, userRole, userEmail }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const fetchNotifications = useCallback(async () => {
    try {
      if (!userId || userId === "undefined" || userId.trim() === "") {
        console.error("[v0] NotificationBell: Invalid userId provided:", userId)
        return
      }

      const result = await fetchNotificationsWithSenders(userId)

      if (result.error) {
        console.error("Error fetching notifications:", result.error)
        return
      }

      setNotifications(result.data)
      setUnreadCount(result.data.filter((n) => !n.is_read).length)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }, [userId]) // Only recreate when userId changes

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId)

      if (error) {
        console.error("Error marking notification as read:", error)
        return
      }

      // Update local state
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", notificationId)

      if (error) {
        console.error("Error deleting notification:", error)
        return
      }

      // Update local state
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
      setUnreadCount((prev) => {
        const notification = notifications.find((n) => n.id === notificationId)
        return notification && !notification.is_read ? Math.max(0, prev - 1) : prev
      })
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)

      if (unreadIds.length === 0) return

      const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds)

      if (error) {
        console.error("Error marking all notifications as read:", error)
        return
      }

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const deleteAll = async () => {
    try {
      const notificationIds = notifications.map((n) => n.id)

      if (notificationIds.length === 0) return

      const { error } = await supabase.from("notifications").delete().in("id", notificationIds).select()

      if (error) {
        console.error("[v0] Error deleting all notifications:", error)
        return
      }

      // Update local state
      setNotifications([])
      setUnreadCount(0)
    } catch (error) {
      console.error("[v0] Error deleting all notifications:", error)
    }
  }

  const handleReply = (notification: Notification) => {
    if (isAdmin) {
      // For admin: navigate to admin notifications with sender prefilled
      router.push(`/admin/notifications?replyTo=${notification.sender_id}`)
    } else {
      // For regular users: navigate to contact page
      router.push("/contact")
    }
    setIsOpen(false) // Close the dropdown
  }

  useEffect(() => {
    if (!userId || userId === "undefined" || userId.trim() === "") {
      console.error("[v0] NotificationBell useEffect: Invalid userId, skipping fetch:", userId)
      return
    }

    fetchNotifications()
  }, [fetchNotifications]) // Now properly depends on memoized function

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`relative p-2 rounded-full transition-all duration-200 ${
            isAdmin
              ? "hover:bg-purple-600/20 hover:ring-2 hover:ring-purple-500/50"
              : "hover:bg-yellow-400/20 hover:ring-2 hover:ring-yellow-400/50"
          }`}
        >
          <Bell className="h-5 w-5 text-gray-300" />
          {unreadCount > 0 && (
            <span
              className={`absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs font-bold text-white flex items-center justify-center ${
                isAdmin ? "bg-purple-600" : "bg-red-600"
              }`}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[28rem] bg-gray-900 border-gray-700 max-h-96 overflow-y-auto"
        align="end"
        sideOffset={5}
      >
        <div className="p-3 border-b border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <h3 className="font-semibold text-white">Notifications</h3>
              {unreadCount > 0 && <p className="text-xs text-gray-400">{unreadCount} unread</p>}
            </div>
            {notifications.length > 0 && (
              <div className="flex flex-col gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="h-6 px-2 text-xs text-gray-400 hover:text-green-400 hover:bg-green-400/10 transition-colors"
                    title="Mark all as read"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    All read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deleteAll}
                  className="h-6 px-2 text-xs text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  title="Delete all notifications"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear all
                </Button>
              </div>
            )}
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${
                  !notification.is_read ? "bg-gray-800/30" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage
                            src={notification.sender?.profile_image_url || "/placeholder.svg"}
                            alt={notification.sender?.full_name || "Unknown"}
                          />
                          <AvatarFallback className="text-xs bg-gray-600 text-gray-200">
                            {(notification.sender?.full_name || "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-xs font-medium text-gray-300">
                          {notification.sender?.full_name || "Unknown"}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className={`w-2 h-2 rounded-full ${isAdmin ? "bg-purple-500" : "bg-red-500"}`} />
                      )}
                    </div>
                    <p className="text-sm text-white break-words whitespace-pre-line">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(notification.created_at)}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReply(notification)}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
                      title="Reply"
                    >
                      <MessageCircle className="h-3 w-3" />
                    </Button>
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-green-400 hover:bg-green-400/10 transition-colors"
                        title="Mark as read"
                      >
                        ✓
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNotification(notification.id)}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      title="Delete notification"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
