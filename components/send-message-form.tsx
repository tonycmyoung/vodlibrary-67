"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Send } from "lucide-react"
import { sendNotificationWithEmail } from "@/lib/actions"

interface SendMessageFormProps {
  userId: string
  userName: string | null
}

export default function SendMessageForm({ userId, userName }: SendMessageFormProps) {
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!message.trim()) {
      setStatus({ type: "error", message: "Please enter a message" })
      return
    }

    setIsLoading(true)
    setStatus({ type: null, message: "" })

    try {
      const result = await sendNotificationWithEmail({
        recipientId: "admin", // This will be handled by the server action to find admin
        message: message.trim(),
        isBroadcast: false,
      })

      if (result.error) {
        throw new Error(result.error)
      }

      setStatus({
        type: "success",
        message: "Message sent successfully! The admin will receive an email notification.",
      })
      setMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
      setStatus({ type: "error", message: "Failed to send message. Please try again." })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto bg-gray-900 border-gray-700">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-6 h-6 text-red-400" />
          <CardTitle className="text-xl font-bold text-white">Send Message to Admin</CardTitle>
        </div>
        <CardDescription className="text-gray-400">
          Send a message directly to the administrator. You'll receive a response via the notification system and email.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
              Your Message
            </label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="min-h-32 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
              maxLength={500}
              disabled={isLoading}
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-500">From: {userName || "Unknown User"}</p>
              <p className="text-xs text-gray-500">{message.length}/500 characters</p>
            </div>
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
            type="submit"
            disabled={isLoading || !message.trim()}
            className="w-full bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
