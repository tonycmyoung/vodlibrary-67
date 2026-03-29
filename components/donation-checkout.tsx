"use client"

import { useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { createDonationCheckout } from "@/lib/actions/donations"
import { DONATION_PRESETS } from "@/lib/donation-products"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { trace } from "@/lib/trace"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")

interface DonationCheckoutProps {
  email: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function DonationCheckout({ email, onSuccess, onCancel }: DonationCheckoutProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("donation-10")
  const [customAmount, setCustomAmount] = useState<string>("")
  const [useCustom, setUseCustom] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCheckout = async () => {
    trace.info("Proceed to Payment clicked", { category: "donation", payload: { useCustom, selectedPreset, customAmount } })
    setIsLoading(true)
    setError(null)

    try {
      let amount: number | undefined
      let presetId: string | undefined

      if (useCustom) {
        const parsedAmount = parseFloat(customAmount)
        if (!customAmount || isNaN(parsedAmount) || parsedAmount < 1) {
          trace.warn("Invalid custom amount entered", { category: "donation", payload: { customAmount } })
          setError("Please enter a valid amount of at least $1")
          setIsLoading(false)
          return
        }
        amount = Math.round(parsedAmount * 100) // Convert to cents
      } else {
        presetId = selectedPreset
      }

      trace.info("Creating checkout session", { category: "donation", payload: { amount, presetId, email } })

      const result = await createDonationCheckout({
        amount,
        presetId,
        email,
        returnUrl: window.location.href,
      })

      if (!result.success) {
        trace.error("Checkout creation failed", { category: "donation", payload: { error: result.error } })
        setError(result.error || "Failed to create checkout")
        setIsLoading(false)
        return
      }

      trace.info("Checkout session created, rendering Stripe form", { category: "donation", payload: { hasClientSecret: !!result.clientSecret } })
      setClientSecret(result.clientSecret)
    } catch (err) {
      trace.error("Checkout error", { category: "donation", payload: { error: err instanceof Error ? err.message : String(err) } })
      setError(err instanceof Error ? err.message : "An error occurred")
      setIsLoading(false)
    }
  }

  if (clientSecret) {
    return (
      <div>
        <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
          <EmbeddedCheckout onComplete={() => {
            trace.info("Payment completed - onComplete callback fired", { category: "donation" })
            onSuccess?.()
          }} />
        </EmbeddedCheckoutProvider>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <input
            type="radio"
            id="preset-donation"
            name="donation-type"
            checked={!useCustom}
            onChange={() => setUseCustom(false)}
            className="w-4 h-4"
          />
          <label htmlFor="preset-donation" className="text-white font-medium cursor-pointer">
            Choose Amount
          </label>
        </div>

        {!useCustom && (
          <div className="grid grid-cols-2 gap-2 pl-6">
            {DONATION_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                onClick={() => setSelectedPreset(preset.id)}
                variant={selectedPreset === preset.id ? "default" : "outline"}
                className={`${
                  selectedPreset === preset.id ? "bg-red-500 hover:bg-red-600" : "border-gray-600 text-gray-300"
                }`}
              >
                {preset.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="radio"
            id="custom-donation"
            name="donation-type"
            checked={useCustom}
            onChange={() => setUseCustom(true)}
            className="w-4 h-4"
          />
          <label htmlFor="custom-donation" className="text-white font-medium cursor-pointer">
            Custom Amount
          </label>
        </div>

        {useCustom && (
          <div className="flex items-center gap-2 pl-6">
            <span className="text-gray-300">$</span>
            <Input
              type="number"
              placeholder="Enter amount in AUD"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              min="1"
              max="10000"
              step="0.01"
              className="flex-1 bg-gray-800 border-gray-600 text-white"
            />
          </div>
        )}
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500/50 rounded text-red-300 text-sm">{error}</div>}

      <Button
        onClick={handleCheckout}
        disabled={isLoading}
        className="w-full bg-red-500 hover:bg-red-600 text-white"
      >
        {isLoading ? (
          <>
            <Spinner className="w-4 h-4 mr-2" />
            Processing...
          </>
        ) : (
          "Proceed to Payment"
        )}
      </Button>

      <Button
        onClick={onCancel}
        variant="outline"
        className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
      >
        Cancel
      </Button>
    </div>
  )
}
