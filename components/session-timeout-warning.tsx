"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Clock, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface SessionTimeoutWarningProps {
  userId: string
}

export default function SessionTimeoutWarning({ userId }: SessionTimeoutWarningProps) {
  const [showWarning, setShowWarning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const supabase = createClient()

  const checkSessionExpiry = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        return
      }

      const expiresAt = session.expires_at
      if (!expiresAt) return

      const now = Math.floor(Date.now() / 1000)
      const timeUntilExpiry = expiresAt - now

      // Show warning 5 minutes (300 seconds) before expiry
      if (timeUntilExpiry <= 300 && timeUntilExpiry > 0) {
        setTimeLeft(timeUntilExpiry)
        setShowWarning(true)
      } else if (timeUntilExpiry <= 0) {
        console.log("[v0] Session has expired")
      }
    } catch (error) {
      console.error("[v0] Session check error:", error)
    }
  }, [supabase.auth])

  const refreshSession = async () => {
    setIsRefreshing(true)
    try {
      const { data, error } = await supabase.auth.refreshSession()

      if (error) {
        console.error("[v0] Session refresh error:", error)
      } else if (data.session) {
        setShowWarning(false)
        setTimeLeft(0)
      }
    } catch (error) {
      console.error("[v0] Session refresh failed:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (!userId || userId === "undefined") return

    // Check session every 30 seconds
    const interval = setInterval(checkSessionExpiry, 30000)

    // Initial check
    checkSessionExpiry()

    return () => clearInterval(interval)
  }, [userId, checkSessionExpiry])

  useEffect(() => {
    if (showWarning && timeLeft > 0) {
      const countdown = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(countdown)
    }
  }, [showWarning, timeLeft])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  return (
    <Dialog open={showWarning} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-yellow-600">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-yellow-400">
            <Clock className="h-5 w-5" />
            Session Expiring Soon
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Your session will expire in <span className="font-mono text-yellow-400">{formatTime(timeLeft)}</span>. Would
            you like to extend your session?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          <Button
            onClick={refreshSession}
            disabled={isRefreshing}
            className="bg-yellow-600 hover:bg-yellow-700 text-black w-full"
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              "Extend Session"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
