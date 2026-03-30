"use client"

import { Ribbon } from "lucide-react"

export interface TrainingBannerProps {
  readonly nextBeltName?: string
}

/**
 * Training banner showing which belt the user is training for.
 * Used on the My Level page.
 */
export function MobileTrainingBanner({ nextBeltName }: TrainingBannerProps) {
  return (
    <div className="mb-3 sm:mb-0 flex items-center gap-2 px-4 py-2 bg-black/30 border border-red-800/30 rounded-lg sm:hidden">
      <Ribbon className="w-4 h-4 text-red-500" />
      <span className="text-sm text-gray-300">
        Training for: <span className="font-semibold text-white">{nextBeltName || "Next Level"}</span>
      </span>
    </div>
  )
}

/**
 * Desktop version of the training banner.
 */
export function DesktopTrainingBanner({ nextBeltName }: TrainingBannerProps) {
  return (
    <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-black/30 border border-red-800/30 rounded-lg whitespace-nowrap">
      <Ribbon className="w-4 h-4 text-red-500 flex-shrink-0" />
      <span className="text-sm text-gray-300">
        Training for: <span className="font-semibold text-white">{nextBeltName || "Next Level"}</span>
      </span>
    </div>
  )
}
