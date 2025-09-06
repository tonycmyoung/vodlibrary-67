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
  onSignOut: () => void
}

export default function SessionTimeoutWarning({ userId, onSignOut }: SessionTimeoutWarningProps) {
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
        onSignOut()
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
        onSignOut()
      }
    } catch (error) {
      console.error("[v0] Session check error:", error)
    }
  }, [supabase.auth, onSignOut])

  const refreshSession = async () => {
    setIsRefreshing(true)
    try {
      const { data, error } = await supabase.auth.refreshSession()

      if (error) {
        console.error("[v0] Session refresh error:", error)
        onSignOut()
      } else if (data.session) {
        setShowWarning(false)
        setTimeLeft(0)
      }
    } catch (error) {
      console.error("[v0] Session refresh failed:", error)
      onSignOut()
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (!userId || userId === "undefined") return

    const interval = setInterval(checkSessionExpiry, 60000)

    // Initial check
    checkSessionExpiry()

    return () => clearInterval(interval)
  }, [userId, checkSessionExpiry])

  useEffect(() => {
    if (showWarning && timeLeft > 0) {
      const countdown = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            onSignOut()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(countdown)
    }
  }, [showWarning, timeLeft, onSignOut])

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
            variant="outline"
            onClick={onSignOut}
            className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
          >
            Sign Out
          </Button>
          <Button
            onClick={refreshSession}
            disabled={isRefreshing}
            className="bg-yellow-600 hover:bg-yellow-700 text-black"
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
