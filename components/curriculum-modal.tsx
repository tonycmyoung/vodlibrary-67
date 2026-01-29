"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ExternalLink, FileText, Award } from "lucide-react"

interface CurriculumModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CurriculumModal({ isOpen, onClose }: CurriculumModalProps) {
  const handleLinkClick = (url: string) => {
    globalThis.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 [&>button]:text-white [&>button]:hover:text-gray-300">
        <DialogHeader>
          <DialogTitle className="text-white text-xl font-bold flex items-center gap-2">
            <Award className="w-6 h-6 text-red-400" />
            Curriculum Resources
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-gray-300 text-sm">Access important curriculum documents and training materials.</p>

          <div className="space-y-3">
            <Button
              onClick={() =>
                handleLinkClick("https://drive.google.com/file/d/1RGKlqb_XNsEOZUgiaEDSBmN86ArVhuZm/view?usp=drive_link")
              }
              className="w-full bg-gray-700 hover:bg-gray-600 hover:scale-[1.02] transition-all duration-200 text-white flex items-center justify-between p-4 h-auto"
            >
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-red-400" />
                <div className="text-left">
                  <div className="font-semibold">Belt Requirements</div>
                  <div className="text-xs text-gray-300 opacity-80">Training progression guidelines</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4" />
            </Button>

            <Button
              onClick={() =>
                handleLinkClick("https://drive.google.com/file/d/1RHvON4aG8KZ1R5xl7lKjkk0NzyREzHax/view?usp=drive_link")
              }
              className="w-full bg-gray-700 hover:bg-gray-600 hover:scale-[1.02] transition-all duration-200 text-white flex items-center justify-between p-4 h-auto"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-semibold">Kobudo Manual</div>
                  <div className="text-xs text-gray-300 opacity-80">Complete training manual</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
