"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, ExternalLink } from "lucide-react"

interface ContributeModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ContributeModal({ isOpen, onClose }: ContributeModalProps) {
  const handleContributeClick = () => {
    window.open(
      "https://drive.google.com/drive/folders/0BwMHmixA7yBXREJYa19LMy1zNnM?resourcekey=0-97Q651ce0-pVxCkxi8NddA",
      "_blank",
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 [&>button]:text-white [&>button]:hover:text-gray-300">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
            <Upload className="w-6 h-6 text-red-400" />
            Contribute your videos
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="text-center text-gray-300 leading-relaxed space-y-2">
            <p>
              This is a link to a secure Google Drive folder where approved users can share videos with the
              Administrator.
            </p>
            <p>Send a message to the admin to request permission.</p>
            <p>If you already have permission this link will work.</p>
          </div>

          <Button
            onClick={handleContributeClick}
            className="w-full bg-gray-700 hover:bg-gray-600 hover:scale-[1.02] transition-all duration-200 text-white flex items-center justify-between p-4 h-auto"
          >
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 text-red-400" />
              <div className="text-left">
                <div className="font-semibold">Access Google Drive Folder</div>
                <div className="text-xs text-gray-300 opacity-80">Share your training videos</div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
