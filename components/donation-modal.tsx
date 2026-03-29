"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Heart, ExternalLink, CreditCard, Copy, Check } from "lucide-react"
import { useState, useEffect } from "react"
import { DonationCheckout } from "@/components/donation-checkout"
import { createClient } from "@/lib/supabase/client"

interface DonationModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function DonationModal({ isOpen, onClose }: DonationModalProps) {
  const [copied, setCopied] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const [showEmailInput, setShowEmailInput] = useState(false)
  const payId = process.env.NEXT_PUBLIC_DONATE_PAYID || ""

  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) {
          setUserEmail(user.email)
        }
      } catch (error) {
        console.error("[v0] Failed to fetch user email:", error)
      }
    }

    if (isOpen) {
      fetchUserEmail()
    }
  }, [isOpen])

  const handleDonateClick = () => {
    globalThis.open("https://paypal.me/TonyYoung1", "_blank")
  }

  const handleCopyPayID = async () => {
    try {
      await navigator.clipboard.writeText(payId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy PayID:", err)
    }
  }

  const handleStripeClick = () => {
    // If email is already filled from auth, go straight to checkout
    if (userEmail.trim()) {
      setShowCheckout(true)
    } else {
      // Otherwise show email input
      setShowEmailInput(true)
    }
  }

  const handleProceedCheckout = () => {
    if (!userEmail.trim()) {
      alert("Please enter a valid email address")
      return
    }
    setShowCheckout(true)
  }

  const handleCheckoutSuccess = () => {
    setShowSuccess(true)
    setShowCheckout(false)
    setShowEmailInput(false)
  }

  const resetModal = () => {
    setShowSuccess(false)
    setShowCheckout(false)
    setShowEmailInput(false)
    setUserEmail("")
    onClose()
  }

  const handleCheckoutCancel = () => {
    setShowCheckout(false)
  }

  // Determine modal width based on state
  const modalWidth = showCheckout || showSuccess ? "sm:max-w-4xl" : "sm:max-w-md"

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${modalWidth} bg-gray-900 border-gray-700 [&>button]:text-white [&>button]:hover:text-gray-300 max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Support the Okinawa Kobudo Library
          </DialogTitle>
        </DialogHeader>

        {showSuccess ? (
          <div className="py-8 text-center space-y-4">
            <div className="flex justify-center mb-6">
              <div className="text-6xl">✓</div>
            </div>
            <h2 className="text-2xl font-bold text-white">Thank You!</h2>
            <p className="text-gray-300 leading-relaxed">
              Your donation has been processed successfully. We truly appreciate your support of the Okinawa Kobudo Library.
            </p>
            <p className="text-gray-400 text-sm">
              A receipt has been sent to {userEmail}
            </p>
            <Button
              onClick={resetModal}
              className="mt-4 bg-purple-600 hover:bg-purple-700 text-white"
            >
              Close
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
            {/* Left side - Info and options */}
            <div className="space-y-4">
              {!showCheckout && !showEmailInput && (
                <>
                  <div className="text-center space-y-4">
                    <p className="text-gray-300 leading-relaxed">Thanks for considering to donate!</p>
                    <p className="text-gray-300 leading-relaxed">
                      Creating and running this site comes with yearly costs for domains, maintenance and hosting.
                    </p>
                    <p className="text-gray-300 leading-relaxed">Anything you&apos;d be willing to donate is appreciated.</p>
                    <p className="text-gray-300 leading-relaxed italic">Thanks - Tony</p>
                  </div>

                  <div className="space-y-3 pt-4">
                    <div className="text-center">
                      <p className="text-gray-400 text-sm mb-3">Choose your preferred payment method:</p>
                    </div>

                    <Button
                      onClick={handleStripeClick}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-2"
                    >
                      <CreditCard className="h-4 w-4" />
                      Donate with Card
                    </Button>

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
                            {payId}
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
                </>
              )}

              {showEmailInput && !showCheckout && (
                <div className="space-y-3">
                  <p className="text-gray-300 text-sm">Enter your email address for the donation receipt:</p>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleProceedCheckout}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Continue
                    </Button>
                    <Button
                      onClick={() => {
                        setShowEmailInput(false)
                        setUserEmail("")
                      }}
                      variant="outline"
                      className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                    >
                      Back
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right side - Stripe form (only show when checking out) */}
            {showCheckout && (
              <div className="bg-gray-800 rounded-lg p-4">
                <DonationCheckout
                  email={userEmail}
                  onSuccess={handleCheckoutSuccess}
                  onCancel={handleCheckoutCancel}
                />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
