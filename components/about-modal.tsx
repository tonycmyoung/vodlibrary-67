"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Info } from "lucide-react"

interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  // Build-time environment variable (set via next.config.mjs)
  const buildTimestamp = process.env.NEXT_PUBLIC_BUILD_TIMESTAMP || "Development"

  // Format the build timestamp for display
  const formatBuildDate = (timestamp: string) => {
    if (timestamp === "Development") return "Development Build"
    try {
      const date = new Date(timestamp)
      return date.toLocaleString("en-AU", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Australia/Sydney",
      })
    } catch {
      return timestamp
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 [&>button]:text-white [&>button]:hover:text-gray-300">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Info className="h-5 w-5 text-red-500" />
            About
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Site Information */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-center">
                <span className="text-white font-bold text-sm leading-tight">
                  古<br />
                  武道
                </span>
              </div>
              <div className="text-left">
                <h2 className="text-xl font-bold text-white">Okinawa Kobudo</h2>
                <p className="text-xs text-gray-400">Training Video Library</p>
              </div>
            </div>
          </div>

          {/* Creator Information */}
          <div className="border-t border-gray-700 pt-4">
            <p className="text-gray-300 text-center">
              Created by <span className="text-white font-medium">Tony Young</span>
            </p>
            <p className="text-gray-500 text-sm text-center mt-1">Copyright 2025-2026. All rights reserved.</p>
          </div>

          {/* Deployment Date */}
          <div className="border-t border-gray-700 pt-4">
            <p className="text-gray-500 text-sm text-center">
              Deployed: {formatBuildDate(buildTimestamp)}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
