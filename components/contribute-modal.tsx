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
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
            <Upload className="w-6 h-6 text-red-500" />
            Contribute your videos
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-center text-gray-300 leading-relaxed space-y-2">
            <p>
              This is a link to a secure Google Drive folder where approved users can share videos with the
              Administrator.
            </p>
            <p>Send a message to the admin to request permission.</p>
            <p>If you already have permission this link will work.</p>
          </div>
          <div className="flex justify-center pt-4">
            <Button
              onClick={handleContributeClick}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 flex items-center gap-2 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Access Google Drive Folder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
