"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Heart, ExternalLink, CreditCard, Copy, Check } from "lucide-react"
import { useState } from "react"

interface DonationModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function DonationModal({ isOpen, onClose }: DonationModalProps) {
  const [copied, setCopied] = useState(false)

  const handleDonateClick = () => {
    window.open("https://paypal.me/TonyYoung1", "_blank")
  }

  const handleCopyPayID = async () => {
    try {
      await navigator.clipboard.writeText("acmyma@gmail.com")
      setCopied(true)
      setTimeout(() => setCopied(false), 2000) // Reset after 2 seconds
    } catch (err) {
      console.error("Failed to copy PayID:", err)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 [&>button]:text-white [&>button]:hover:text-gray-300">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Support TY Kobudo Library
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-center space-y-4">
            <p className="text-gray-300 leading-relaxed">Thanks for considering to donate!</p>

            <p className="text-gray-300 leading-relaxed">
              Creating and running this site comes with yearly costs for domains, maintenance and hosting.
            </p>

            <p className="text-gray-300 leading-relaxed">Anything you'd be willing to donate is appreciated.</p>

            <p className="text-gray-300 leading-relaxed italic">Thanks - Tony</p>
          </div>

          <div className="space-y-3 pt-4">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-3">Choose your preferred payment method:</p>
            </div>

            <Button
              onClick={handleDonateClick}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
            >
              <Heart className="h-4 w-4" />
              Donate via PayPal
              <ExternalLink className="h-4 w-4" />
            </Button>

            <div className="w-full p-3 border border-gray-600 rounded-md bg-gray-800/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-green-500" />
                  <span className="text-white font-medium">PayID</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-gray-700 px-2 py-1 rounded text-green-400 text-sm leading-5">
                    acmyma@gmail.com
                  </span>
                  <button
                    onClick={handleCopyPayID}
                    className="p-1 hover:bg-gray-600 rounded transition-colors"
                    title={copied ? "Copied!" : "Copy PayID"}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-400 hover:text-white" />
                    )}
                  </button>
                </div>
              </div>
              <p className="text-gray-400 text-xs">
                Use this PayID in your banking app. Check with your bank for PayID instructions.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={onClose}
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
