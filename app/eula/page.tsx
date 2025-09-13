import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "End User License Agreement | TY Kobudo Library",
  description: "End User License Agreement for TY Kobudo Library video platform",
}

export default function EULAPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-orange-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 p-8">
          <h1 className="text-3xl font-bold text-white mb-8 text-center">End User License Agreement</h1>

          <div className="prose prose-slate dark:prose-invert max-w-none">
            <div className="space-y-6 text-gray-300 leading-relaxed">
              <p className="text-lg font-medium text-white">TY Kobudo Library - Video Platform Terms of Use</p>

              <div className="bg-gray-800/60 p-6 rounded-lg border-l-4 border-red-500">
                <p className="font-medium text-white mb-2">Important Notice:</p>
                <p>
                  This is a placeholder for your EULA content. Please replace this text with your complete End User
                  License Agreement terms and conditions.
                </p>
              </div>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
                <p>
                  By accessing or using this video platform, you agree to abide by this End User License Agreement and
                  our Privacy Notice. All videos are owned by Tony Young and are provided solely for private viewing by
                  authorized members.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">2. License Grant</h2>
                <p>
                  Videos are for personal study only. Downloading, distributing, or sharing this material without
                  authorization is strictly prohibited.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">3. Restrictions</h2>
                <p>
                  Unauthorized reproduction or distribution is strictly prohibited. Users may not copy, distribute, or
                  share video content outside of this platform.
                </p>
              </section>

              <div className="bg-amber-900/40 p-6 rounded-lg border border-amber-600">
                <p className="text-amber-200 font-medium">
                  Please replace this placeholder content with your complete EULA terms.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-700">
            <p className="text-sm text-gray-400 text-center">Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
