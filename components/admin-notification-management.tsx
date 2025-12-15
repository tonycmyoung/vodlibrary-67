"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageSquare, Send, Users, User, Search, Trash2, Eye, EyeOff, Loader2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { sendNotificationWithEmail } from "@/lib/actions"
import { useSearchParams } from "next/navigation"

interface Notification {
  id: string
  sender_id: string
  recipient_id: string
  message: string
  is_read: boolean
  is_broadcast: boolean
  created_at: string
  sender: {
    full_name: string | null
    email: string
  } | null
  recipient: {
    full_name: string | null
    email: string
  } | null
}

interface UserOption {
  id: string
  full_name: string | null
  email: string
  profile_image_url: string | null
  is_approved: boolean
  role: string
}

export default function AdminNotificationManagement() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)

  // Send message form state
  const [messageText, setMessageText] = useState("")
  const [selectedRecipient, setSelectedRecipient] = useState<string>("")
  const [messageType, setMessageType] = useState<"individual" | "broadcast">("individual")
  const [broadcastRole, setBroadcastRole] = useState<"all" | "Head Teacher" | "Teacher" | "Student">("all")
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({
    all: 0,
    "Head Teacher": 0,
    Teacher: 0,
    Student: 0,
  })
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  })

  const supabase = createBrowserClient()
  const searchParams = useSearchParams()

  useEffect(() => {
    fetchNotifications()
    fetchUsers()
  }, [])

  useEffect(() => {
    filterNotifications()
  }, [notifications, searchQuery])

  useEffect(() => {
    const replyToUserId = searchParams.get("replyTo")
    if (replyToUserId && users.length > 0) {
      const replyUser = users.find((user) => user.id === replyToUserId)
      if (replyUser) {
        setMessageType("individual")
        setSelectedRecipient(replyToUserId)
      }
    }
  }, [searchParams, users, messageText])

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          id,
          sender_id,
          recipient_id,
          message,
          is_read,
          is_broadcast,
          created_at,
          sender:users!sender_id(full_name, email),
          recipient:users!recipient_id(full_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) {
        console.error("Error fetching notifications:", error)
        return
      }

      setNotifications(data || [])
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, profile_image_url, is_approved, role")
        .eq("is_approved", true)
        .neq("email", "acmyma@gmail.com")
        .order("full_name", { ascending: true })

      if (error) {
        console.error("Error fetching users:", error)
        return
      }

      setUsers(data || [])

      const counts = {
        all: data?.length || 0,
        "Head Teacher": data?.filter((u) => u.role === "Head Teacher").length || 0,
        Teacher: data?.filter((u) => u.role === "Teacher").length || 0,
        Student: data?.filter((u) => u.role === "Student").length || 0,
      }
      setRoleCounts(counts)
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const filterNotifications = () => {
    if (!searchQuery) {
      setFilteredNotifications(notifications)
      return
    }

    const filtered = notifications.filter(
      (notification) =>
        notification.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.sender?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.sender?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.recipient?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.recipient?.email.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    setFilteredNotifications(filtered)
  }

  const sendMessage = async () => {
    if (!messageText.trim()) {
      setStatus({ type: "error", message: "Please enter a message" })
      return
    }

    if (messageType === "individual" && !selectedRecipient) {
      setStatus({ type: "error", message: "Please select a recipient" })
      return
    }

    setSendingMessage(true)
    setStatus({ type: null, message: "" })

    try {
      const result = await sendNotificationWithEmail({
        recipientId: messageType === "individual" ? selectedRecipient : undefined,
        message: messageText.trim(),
        isBroadcast: messageType === "broadcast",
        broadcastRole: messageType === "broadcast" ? broadcastRole : undefined,
      })

      if (result.error) {
        throw new Error(result.error)
      }

      if (messageType === "broadcast") {
        const roleLabel = broadcastRole === "all" ? "All Users" : `${broadcastRole}s`
        const count = roleCounts[broadcastRole]
        setStatus({ type: "success", message: `Email notifications sent to ${count} ${roleLabel}!` })
      } else {
        const recipientUser = users.find((u) => u.id === selectedRecipient)
        setStatus({
          type: "success",
          message: `Message sent to ${recipientUser?.full_name || recipientUser?.email}! They will receive an email notification.`,
        })
      }

      setMessageText("")
      setSelectedRecipient("")
      fetchNotifications()
    } catch (error) {
      console.error("Error sending message:", error)
      setStatus({ type: "error", message: "Failed to send message. Please try again." })
    } finally {
      setSendingMessage(false)
    }
  }

  const toggleReadStatus = async (notificationId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: !currentStatus })
        .eq("id", notificationId)

      if (error) throw error

      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: !currentStatus } : n)))
    } catch (error) {
      console.error("Error updating notification status:", error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", notificationId)

      if (error) throw error

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  const getUserInitials = (email: string, name?: string) => {
    if (name?.trim()) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    }
    if (email?.trim()) {
      return email[0].toUpperCase()
    }
    return "?" // Added fallback for when both name and email are unavailable
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`
    return `${Math.floor(diffInSeconds / 2592000)} months ago`
  }

  return (
    <div className="space-y-6">
      {/* Send Message Card */}
      <Card className="bg-black/60 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <MessageSquare className="w-6 h-6 text-purple-400" />
            <span>Send Message</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-4">
            <Button
              variant={messageType === "individual" ? "default" : "ghost"}
              onClick={() => setMessageType("individual")}
              className={`flex items-center space-x-2 ${
                messageType === "individual"
                  ? "bg-purple-600 hover:bg-purple-700 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <User className="w-4 h-4" />
              <span>Individual</span>
            </Button>
            <Button
              variant={messageType === "broadcast" ? "default" : "ghost"}
              onClick={() => setMessageType("broadcast")}
              className={`flex items-center space-x-2 ${
                messageType === "broadcast"
                  ? "bg-purple-600 hover:bg-purple-700 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Broadcast</span>
            </Button>
          </div>

          {messageType === "individual" && (
            <div>
              <label htmlFor="recipient-select" className="block text-sm font-medium text-gray-300 mb-2">
                Select Recipient
              </label>
              <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                <SelectTrigger id="recipient-select" className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {users.length === 0 ? (
                    <div className="p-2 text-gray-400 text-sm">No approved users available</div>
                  ) : (
                    users.map((user) => (
                      <SelectItem key={user.id} value={user.id} className="text-white hover:bg-gray-700">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={user.profile_image_url || "/placeholder.svg"} />
                            <AvatarFallback className="bg-purple-600 text-white text-xs">
                              {getUserInitials(user.email, user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{user.full_name || user.email}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {messageType === "broadcast" && (
            <div>
              <label htmlFor="broadcast-role-select" className="block text-sm font-medium text-gray-300 mb-2">
                Select Recipients
              </label>
              <Select value={broadcastRole} onValueChange={(value) => setBroadcastRole(value as typeof broadcastRole)}>
                <SelectTrigger id="broadcast-role-select" className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all" className="text-white hover:bg-gray-700">
                    All Users ({roleCounts.all})
                  </SelectItem>
                  <SelectItem value="Head Teacher" className="text-white hover:bg-gray-700">
                    Head Teachers ({roleCounts["Head Teacher"]})
                  </SelectItem>
                  <SelectItem value="Teacher" className="text-white hover:bg-gray-700">
                    Teachers ({roleCounts.Teacher})
                  </SelectItem>
                  <SelectItem value="Student" className="text-white hover:bg-gray-700">
                    Students ({roleCounts.Student})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label htmlFor="message-text" className="block text-sm font-medium text-gray-300 mb-2">
              Message
            </label>
            <Textarea
              id="message-text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={
                messageType === "broadcast" ? "Type your broadcast message here..." : "Type your message here..."
              }
              className="min-h-24 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
              maxLength={500}
              disabled={sendingMessage}
            />
            <p className="text-xs text-gray-500 mt-1">{messageText.length}/500 characters</p>
          </div>

          {status.type && (
            <div
              className={`p-3 rounded-md ${
                status.type === "success"
                  ? "bg-green-500/10 border border-green-500/50 text-green-400"
                  : "bg-red-500/10 border border-red-500/50 text-red-400"
              }`}
            >
              {status.message}
            </div>
          )}

          <Button
            onClick={sendMessage}
            disabled={sendingMessage || !messageText.trim() || (messageType === "individual" && !selectedRecipient)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {sendingMessage ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {messageType === "broadcast" && (
                  <>
                    Send to {broadcastRole === "all" ? "All Users" : `${broadcastRole}s`} ({roleCounts[broadcastRole]})
                  </>
                )}
                {messageType === "individual" && "Send Message"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Notifications List Card */}
      <Card className="bg-black/60 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">All Notifications ({notifications.length})</CardTitle>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                aria-label="Search notifications"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-400"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              <span className="ml-2 text-gray-300">Loading notifications...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-500" />
              <p className="text-gray-400">No notifications found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    notification.is_read ? "bg-gray-900/30 border-gray-700" : "bg-purple-900/20 border-purple-700/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={notification.sender?.profile_image_url || "/placeholder.svg"} />
                            <AvatarFallback className="bg-gray-600 text-white text-xs">
                              {getUserInitials(notification.sender?.email || "", notification.sender?.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-gray-300">
                            {notification.sender?.full_name || notification.sender?.email || "Unknown"}
                          </span>
                        </div>
                        <span className="text-gray-500">→</span>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={notification.recipient?.profile_image_url || "/placeholder.svg"} />
                            <AvatarFallback className="bg-gray-600 text-white text-xs">
                              {getUserInitials(notification.recipient?.email || "", notification.recipient?.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-gray-300">
                            {notification.recipient?.full_name || notification.recipient?.email || "Unknown"}
                          </span>
                        </div>
                        {notification.is_broadcast && <Badge className="bg-purple-600 text-white">Broadcast</Badge>}
                        {!notification.is_read && <div className="w-2 h-2 rounded-full bg-purple-500" />}
                      </div>

                      <p className="text-white mb-2 break-words whitespace-pre-line">{notification.message}</p>

                      <p className="text-xs text-gray-500">{formatTimeAgo(notification.created_at)}</p>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleReadStatus(notification.id, notification.is_read)}
                        className="text-gray-400 hover:text-white"
                      >
                        {notification.is_read ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNotification(notification.id)}
                        className="text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
