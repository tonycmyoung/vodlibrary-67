import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Notice | TY Kobudo Library",
  description: "Privacy Notice for TY Kobudo Library video platform",
}

export default function PrivacyNoticePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-orange-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 p-8">
          <h1 className="text-3xl font-bold text-white mb-8 text-center">Privacy Notice</h1>

          <div className="prose prose-slate dark:prose-invert max-w-none">
            <div className="space-y-6 text-gray-300 leading-relaxed">
              <p className="text-lg font-medium text-white">TY Kobudo Library - Privacy Policy</p>

              <div className="bg-gray-800/60 p-6 rounded-lg border-l-4 border-red-500">
                <p className="font-medium text-white mb-2">Important Notice:</p>
                <p>
                  This is a placeholder for your Privacy Notice content. Please replace this text with your complete
                  privacy policy and data handling practices.
                </p>
              </div>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
                <p>
                  We collect information you provide when registering for an account, including your name, email
                  address, school, and teacher information.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Information</h2>
                <p>
                  Your information is used to provide access to the video library, track your progress, and communicate
                  important updates about the platform.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">3. Data Security</h2>
                <p>
                  We implement appropriate security measures to protect your personal information against unauthorized
                  access, alteration, disclosure, or destruction.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">4. Contact Information</h2>
                <p>If you have questions about this Privacy Notice, please contact us through the platform.</p>
              </section>

              <div className="bg-amber-900/40 p-6 rounded-lg border border-amber-600">
                <p className="text-amber-200 font-medium">
                  Please replace this placeholder content with your complete Privacy Notice.
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
