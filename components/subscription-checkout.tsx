"use client"

import { useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { createSubscriptionCheckout } from "@/lib/actions/donations"
import { SUBSCRIPTION_TIERS } from "@/lib/donation-products"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { trace } from "@/lib/trace"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")

interface SubscriptionCheckoutProps {
  readonly email: string
  readonly onSuccess?: () => void
  readonly onCancel?: () => void
  readonly onBack?: () => void
}

export function SubscriptionCheckout({ email, onSuccess, onCancel, onBack }: SubscriptionCheckoutProps) {
  const [selectedTier, setSelectedTier] = useState<string>("supporter")
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly")
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubscribe = async () => {
    trace.info("Subscribe clicked", { category: "subscription", payload: { selectedTier, interval } })
    setIsLoading(true)
    setError(null)

    try {
      const result = await createSubscriptionCheckout({
        tierId: selectedTier,
        interval,
        email,
        returnUrl: window.location.href,
      })

      if (!result.success) {
        trace.error("Subscription checkout creation failed", { category: "subscription", payload: { error: result.error } })
        setError(result.error || "Failed to create subscription checkout")
        setIsLoading(false)
        return
      }

      trace.info("Subscription checkout session created", { category: "subscription", payload: { hasClientSecret: !!result.clientSecret } })
      setClientSecret(result.clientSecret)
    } catch (err) {
      trace.error("Subscription checkout error", { category: "subscription", payload: { error: err instanceof Error ? err.message : String(err) } })
      setError(err instanceof Error ? err.message : "An error occurred")
      setIsLoading(false)
    }
  }

  if (clientSecret) {
    return (
      <div>
        <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
          <EmbeddedCheckout onComplete={onSuccess} />
        </EmbeddedCheckoutProvider>
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="subscription-checkout">
      {/* Interval Toggle */}
      <div className="flex gap-2 justify-center">
        <button
          onClick={() => setInterval("monthly")}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            interval === "monthly"
              ? "bg-purple-600 text-white"
              : "bg-gray-800 text-gray-300 border border-gray-600 hover:border-gray-500"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setInterval("annual")}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            interval === "annual"
              ? "bg-purple-600 text-white"
              : "bg-gray-800 text-gray-300 border border-gray-600 hover:border-gray-500"
          }`}
        >
          Annual
        </button>
      </div>

      {/* Tier Selection */}
      <div className="grid grid-cols-3 gap-3">
        {SUBSCRIPTION_TIERS.map((tier) => {
          const priceData = tier.prices[interval]
          const displayPrice = interval === "monthly" ? `$${(priceData.amount / 100).toFixed(2)}` : `$${(priceData.amount / 100).toFixed(2)}`
          const billingPeriod = interval === "monthly" ? "/month" : "/year"

          return (
            <button
              key={tier.id}
              onClick={() => setSelectedTier(tier.id)}
              className={`p-4 rounded-lg border transition-all ${
                selectedTier === tier.id
                  ? "border-purple-500 bg-purple-600/20"
                  : "border-gray-600 bg-gray-800/50 hover:border-gray-500"
              }`}
            >
              <div className="text-white font-semibold text-sm mb-2">{tier.name}</div>
              <div className="text-gray-200 text-lg font-bold">
                {displayPrice}
                <span className="text-xs text-gray-400">{billingPeriod}</span>
              </div>
            </button>
          )
        })}
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500/50 rounded text-red-300 text-sm">{error}</div>}

      <Button
        onClick={handleSubscribe}
        disabled={isLoading}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
      >
        {isLoading ? (
          <>
            <Spinner className="w-4 h-4 mr-2" />
            Processing...
          </>
        ) : (
          "Subscribe"
        )}
      </Button>

      <Button
        onClick={onBack || onCancel}
        variant="outline"
        className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
      >
        Back
      </Button>
    </div>
  )
}
