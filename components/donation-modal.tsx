"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Heart, ExternalLink, CreditCard, Copy, Check } from "lucide-react"
import { useState, useEffect } from "react"
import { DonationCheckout } from "@/components/donation-checkout"
import { SubscriptionCheckout } from "@/components/subscription-checkout"
import { createClient } from "@/lib/supabase/client"
import { trace } from "@/lib/trace"
import { createCustomerPortalSession, checkExistingSubscription } from "@/lib/actions/donations"

interface DonationModalProps {
  isOpen: boolean
  onClose: () => void
}

function SuccessScreen({ email, onClose, isSubscription }: { email: string; onClose: () => void; isSubscription: boolean }) {
  return (
    <div className="py-8 text-center space-y-4">
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="w-8 h-8 text-green-500" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-white">Thank You!</h2>
      <p className="text-gray-300 leading-relaxed">
        {isSubscription
          ? "Your subscription has been set up successfully. We truly appreciate your ongoing support of the Okinawa Kobudo Library."
          : "Your donation has been processed successfully. We truly appreciate your support of the Okinawa Kobudo Library."}
      </p>
      <p className="text-gray-400 text-sm">
        {isSubscription ? "A confirmation email has been sent to" : "A receipt has been sent to"} {email}
      </p>
      <Button
        onClick={onClose}
        className="mt-4 bg-purple-600 hover:bg-purple-700 text-white"
      >
        Close
      </Button>
    </div>
  )
}

function ExistingSubWarning({
  existingSubCount,
  onConfirm,
  onCancel,
}: {
  existingSubCount: number
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="space-y-4 py-4">
      <h2 className="text-xl font-bold text-white">You Already Have a Regular Donation</h2>
      <p className="text-gray-300 text-sm">
        You currently have {existingSubCount} active regular donation{existingSubCount > 1 ? "s" : ""}. 
        Are you sure you want to set up an additional one?
      </p>
      <p className="text-gray-400 text-sm">
        If you&apos;d like to change your existing donation instead, you can use &quot;Manage a regular donation&quot; from the main menu.
      </p>
      <Button
        onClick={onConfirm}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
      >
        Yes, Set Up Additional Donation
      </Button>
      <Button
        onClick={onCancel}
        variant="outline"
        className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
      >
        No, Go Back
      </Button>
    </div>
  )
}

function ManagePortalView({
  portalError,
  isLoadingPortal,
  onManage,
  onClose,
}: {
  portalError: string | null
  isLoadingPortal: boolean
  onManage: () => void
  onClose: () => void
}) {
  return (
    <div className="space-y-4 py-4">
      <h2 className="text-xl font-bold text-white">Manage Your Subscription</h2>
      <p className="text-gray-300 text-sm">
        We&apos;ll look up your subscription using your email address and redirect you to Stripe&apos;s portal where you can manage your subscription, update your payment method, or cancel if needed.
      </p>
      {portalError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
          {portalError}
        </div>
      )}
      <Button
        onClick={onManage}
        disabled={isLoadingPortal}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoadingPortal ? "Loading..." : "Access Subscription Portal"}
      </Button>
      <Button
        onClick={onClose}
        variant="outline"
        className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
      >
        Back
      </Button>
    </div>
  )
}

function EmailInputView({
  userEmail,
  onEmailChange,
  onProceed,
  onBack,
}: {
  userEmail: string
  onEmailChange: (email: string) => void
  onProceed: () => void
  onBack: () => void
}) {
  return (
    <div className="space-y-3 py-4">
      <p className="text-gray-300 text-sm">Enter your email address for the donation receipt:</p>
      <input
        type="email"
        placeholder="your@email.com"
        value={userEmail}
        onChange={(e) => onEmailChange(e.target.value)}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
      />
      <div className="flex gap-2">
        <Button
          onClick={onProceed}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
        >
          Continue
        </Button>
        <Button
          onClick={onBack}
          variant="outline"
          className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
        >
          Back
        </Button>
      </div>
    </div>
  )
}

function PaymentOptionsView({
  payId,
  copied,
  isCheckingSubscription,
  onStripeClick,
  onPayPalClick,
  onCopyPayID,
  onSubscribeClick,
  onClose,
  onManagePortal,
}: {
  payId: string
  copied: boolean
  isCheckingSubscription: boolean
  onStripeClick: () => void
  onPayPalClick: () => void
  onCopyPayID: () => void
  onSubscribeClick: () => void
  onClose: () => void
  onManagePortal: () => void
}) {
  return (
    <div className="space-y-4 pt-4 pb-0">
      <div className="text-center space-y-4">
        <p className="text-gray-300 leading-relaxed">Thanks for considering to donate!</p>
        <p className="text-gray-300 leading-relaxed">
          Creating and running this site comes with yearly costs for domains, maintenance and hosting.
        </p>
        <p className="text-gray-300 leading-relaxed">Anything you&apos;d be willing to donate is appreciated.</p>
        <p className="text-gray-300 leading-relaxed italic">Thanks - Tony</p>
      </div>

      <div className="space-y-2 pt-4 pb-4">
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-3">Choose your preferred payment method:</p>
        </div>

        <Button
          onClick={onStripeClick}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-2 focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <CreditCard className="h-4 w-4" />
          Donate once-off with Card
        </Button>

        <Button
          onClick={onPayPalClick}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
        >
          <Heart className="h-4 w-4" />
          Donate once-off via PayPal
          <ExternalLink className="h-4 w-4" />
        </Button>

        <button
          onClick={onCopyPayID}
          className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800/50 hover:bg-gray-800 transition-colors flex items-center gap-3 group"
          title={copied ? "Copied!" : "Click to copy PayID"}
        >
          <CreditCard className="h-4 w-4 text-green-500 flex-shrink-0" />
          <div className="flex flex-col items-start flex-1 min-w-0">
            <span className="text-white font-medium text-sm leading-tight">PayID</span>
            <span className="text-gray-400 text-xs leading-tight">Use in your banking app</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="font-mono bg-gray-700 px-2 py-1 rounded text-green-400 text-sm leading-5 group-hover:bg-gray-600 transition-colors truncate max-w-[140px]">
              {payId}
            </span>
            {copied ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors" />
            )}
          </div>
        </button>

        {/* Divider between one-time and regular */}
        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-700" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-gray-900 px-3 text-gray-500">or donate regularly</span>
          </div>
        </div>

        <Button
          onClick={onSubscribeClick}
          disabled={isCheckingSubscription}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-2 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50"
        >
          <CreditCard className="h-4 w-4" />
          {isCheckingSubscription ? "Checking..." : "Donate regularly with Card"}
        </Button>

        {/* Footer actions */}
        <div className="pt-2 border-t border-gray-700 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            Maybe Later
          </button>
          <button
            onClick={onManagePortal}
            className="text-sm text-gray-400 hover:text-purple-400 transition-colors"
          >
            Manage a regular donation
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DonationModal({ isOpen, onClose }: DonationModalProps) {
  const [copied, setCopied] = useState(false)
  const [showAmountSelect, setShowAmountSelect] = useState(false)
  const [showSubscriptionSelect, setShowSubscriptionSelect] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [isSubscriptionSuccess, setIsSubscriptionSuccess] = useState(false)
  const [showManagePortal, setShowManagePortal] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)
  const [isLoadingPortal, setIsLoadingPortal] = useState(false)
  const [showExistingSubWarning, setShowExistingSubWarning] = useState(false)
  const [existingSubCount, setExistingSubCount] = useState(0)
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false)
  const payId = process.env.NEXT_PUBLIC_DONATE_PAYID || ""

  useEffect(() => {
    if (showSuccess) {
      trace.info("Payment/Subscription completed - thank you screen shown", { category: "donation", payload: { email: userEmail, isSubscription: isSubscriptionSuccess } })
    }
  }, [showSuccess, userEmail, isSubscriptionSuccess])

  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) {
          setUserEmail(user.email)
        }
      } catch (error) {
        trace.error("Failed to fetch user email", { category: "donation", payload: { error: String(error) } })
      }
    }

    if (isOpen) {
      trace.info("Donation modal opened", { category: "donation" })
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
    trace.info("Donate once-off with Card clicked", { category: "donation", payload: { hasEmail: !!userEmail.trim() } })
    if (userEmail.trim()) {
      setShowAmountSelect(true)
    } else {
      setShowEmailInput(true)
    }
  }

  const handleSubscribeClick = async () => {
    trace.info("Donate regularly with Card clicked", { category: "subscription", payload: { hasEmail: !!userEmail.trim() } })
    if (!userEmail.trim()) {
      setShowEmailInput(true)
      return
    }

    // Check for existing subscriptions
    setIsCheckingSubscription(true)
    try {
      const result = await checkExistingSubscription({ email: userEmail })
      if (result.hasSubscription) {
        setExistingSubCount(result.subscriptionCount)
        setShowExistingSubWarning(true)
      } else {
        setShowSubscriptionSelect(true)
      }
    } catch (error) {
      // On error, proceed anyway
      setShowSubscriptionSelect(true)
    } finally {
      setIsCheckingSubscription(false)
    }
  }

  const handleConfirmAdditionalSubscription = () => {
    trace.info("User confirmed additional subscription", { category: "subscription", payload: { existingCount: existingSubCount } })
    setShowExistingSubWarning(false)
    setShowSubscriptionSelect(true)
  }

  const handleCancelAdditionalSubscription = () => {
    trace.info("User cancelled additional subscription", { category: "subscription" })
    setShowExistingSubWarning(false)
  }

  const handleProceedCheckout = (isSubscription: boolean) => {
    trace.info("Email submitted for checkout", { category: isSubscription ? "subscription" : "donation", payload: { email: userEmail } })
    if (!userEmail.trim()) {
      alert("Please enter a valid email address")
      return
    }
    if (isSubscription) {
      setShowSubscriptionSelect(true)
    } else {
      setShowAmountSelect(true)
    }
  }

  const handleCheckoutSuccess = (isSubscription: boolean = false) => {
    setIsSubscriptionSuccess(isSubscription)
    setShowSuccess(true)
    setShowAmountSelect(false)
    setShowSubscriptionSelect(false)
    setShowEmailInput(false)
  }

  const resetModal = () => {
    trace.info("Donation modal closed", { category: "donation" })
    setShowSuccess(false)
    setShowAmountSelect(false)
    setShowSubscriptionSelect(false)
    setShowEmailInput(false)
    setShowManagePortal(false)
    setShowExistingSubWarning(false)
    setExistingSubCount(0)
    setUserEmail("")
    setIsSubscriptionSuccess(false)
    setPortalError(null)
    onClose()
  }

  const handleCheckoutCancel = () => {
    trace.info("Checkout cancelled by user", { category: "donation" })
    setShowAmountSelect(false)
    setShowSubscriptionSelect(false)
  }

  const handleManageSubscription = async () => {
    trace.info("Manage existing subscription clicked", { category: "subscription", payload: { email: userEmail } })
    if (!userEmail.trim()) {
      setPortalError("Email is missing")
      return
    }

    setIsLoadingPortal(true)
    setPortalError(null)

    try {
      const result = await createCustomerPortalSession({
        email: userEmail,
        returnUrl: window.location.href,
      })

      if (result.success && result.portalUrl) {
        trace.info("Portal session created successfully", { category: "subscription", payload: { email: userEmail } })
        // Open portal in new tab
        window.open(result.portalUrl, "_blank")
        setShowManagePortal(false)
      } else {
        trace.warn("No active subscription found", { category: "subscription", payload: { email: userEmail } })
        setPortalError(result.error || "Unable to manage subscription")
      }
    } catch (error) {
      trace.error("Failed to create portal session", { category: "subscription", payload: { error: String(error), email: userEmail } })
      setPortalError("An error occurred. Please try again.")
    } finally {
      setIsLoadingPortal(false)
    }
  }

  const handleOpenManagePortal = () => {
    trace.info("Manage subscription view opened", { category: "subscription" })
    setShowManagePortal(true)
    setPortalError(null)
  }

  const handleCloseManagePortal = () => {
    trace.info("Manage subscription view closed", { category: "subscription" })
    setShowManagePortal(false)
    setPortalError(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={resetModal}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 [&>button]:text-white [&>button]:hover:text-gray-300 max-h-[90vh] flex flex-col pb-0">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-white flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Support the Okinawa Kobudo Library
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {showSuccess ? (
            <SuccessScreen email={userEmail} onClose={resetModal} isSubscription={isSubscriptionSuccess} />
          ) : showExistingSubWarning ? (
            <ExistingSubWarning
              existingSubCount={existingSubCount}
              onConfirm={handleConfirmAdditionalSubscription}
              onCancel={handleCancelAdditionalSubscription}
            />
          ) : showManagePortal ? (
            <ManagePortalView
              portalError={portalError}
              isLoadingPortal={isLoadingPortal}
              onManage={handleManageSubscription}
              onClose={handleCloseManagePortal}
            />
          ) : showAmountSelect ? (
            <div className="py-4">
              <DonationCheckout
                email={userEmail}
                onSuccess={() => handleCheckoutSuccess(false)}
                onCancel={handleCheckoutCancel}
              />
            </div>
          ) : showSubscriptionSelect ? (
            <div className="py-4">
              <SubscriptionCheckout
                email={userEmail}
                onSuccess={() => handleCheckoutSuccess(true)}
                onCancel={handleCheckoutCancel}
                onBack={handleCheckoutCancel}
              />
            </div>
          ) : showEmailInput ? (
            <EmailInputView
              userEmail={userEmail}
              onEmailChange={setUserEmail}
              onProceed={() => handleProceedCheckout(false)}
              onBack={() => {
                setShowEmailInput(false)
                setUserEmail("")
              }}
            />
          ) : (
            <PaymentOptionsView
              payId={payId}
              copied={copied}
              isCheckingSubscription={isCheckingSubscription}
              onStripeClick={handleStripeClick}
              onPayPalClick={handleDonateClick}
              onCopyPayID={handleCopyPayID}
              onSubscribeClick={handleSubscribeClick}
              onClose={onClose}
              onManagePortal={handleOpenManagePortal}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
