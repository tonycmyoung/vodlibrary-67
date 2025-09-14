import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy | Okinawa Kobudo Library",
  description: "Privacy Policy for Okinawa Kobudo Library video platform",
}

export default function PrivacyNoticePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-orange-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 p-8">
          <h1 className="text-3xl font-bold text-white mb-8 text-center">Privacy Policy</h1>

          <div className="prose prose-slate dark:prose-invert max-w-none">
            <div className="space-y-6 text-gray-300 leading-relaxed">
              <p className="text-lg font-medium text-white">Okinawa Kobudo Library - Privacy Policy</p>
              <p>
                TY Kobudo ("we", "us", or "our"), in providing the Okinawa Kobudo Library, is committed to respecting
                your privacy and protecting your personal information. This Privacy Policy describes how we collect,
                use, store, and protect the information you provide when using our platform.
              </p>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
                <p>We collect the following personal information:</p>
                <ul className="list-disc list-inside ml-6">
                  <li>First and last name</li>
                  <li>Email address</li>
                  <li>School/dojo affiliation</li>
                  <li>Name of your Teacher/Sensei</li>
                </ul>
                <p>
                  We also collect non-personal information such as browser type, device, and usage data to improve our
                  Service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">2. How We Collect Your Information</h2>
                <p>Information is collected when you:</p>
                <ul className="list-disc list-inside ml-6">
                  <li>Register for access</li>
                  <li>Complete online forms</li>
                  <li>Communicate with us via email or online channels</li>
                  <li>Use our platform (cookies, analytics, etc.)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
                <p>We use your information for:</p>
                <ul className="list-disc list-inside ml-6">
                  <li>Providing and managing access to the video library</li>
                  <li>Maintaining user accounts</li>
                  <li>Communicating important updates or support information</li>
                  <li>Improving and personalizing your experience</li>
                  <li>Complying with legal obligations</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">4. Sharing Your Information</h2>
                <p>We do not sell your personal data. We may share it only:</p>
                <ul className="list-disc list-inside ml-6">
                  <li>With your explicit consent</li>
                  <li>To comply with legal obligations</li>
                  <li>With trusted service providers who assist in platform operations</li>
                  <li>In case of business transfer or merger</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">5. Storage and Security</h2>
                <p>
                  Your information is stored securely and accessed only by authorized personnel. We use
                  industry-standard security measures to safeguard your data. While we strive for protection, no method
                  is 100% secure.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">6. International Transfer</h2>
                <p>
                  If your information is transferred or stored outside your home country, we ensure appropriate
                  protection is in place, in line with applicable privacy laws.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">7. Cookies and Tracking</h2>
                <p>
                  Our site may use cookies and similar technologies to enhance user experience, remember preferences,
                  and analyse platform activity. You may choose to disable cookies in your browser settings; some
                  features may not function properly as a result.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">8. Your Rights and Choices</h2>
                <p>You have the right to:</p>
                <ul className="list-disc list-inside ml-6">
                  <li>Request access to or correction of your personal data</li>
                  <li>Withdraw consent or request deletion, subject to law and access requirements</li>
                  <li>Manage communication and marketing preferences</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">9. Changes to This Policy</h2>
                <p>
                  We may update this Privacy Policy. Significant changes will be communicated clearly, and continued use
                  after changes constitutes acceptance.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">10. Contact Information</h2>
                <p>
                  For questions or requests regarding this Privacy Policy, contact us via email at
                  admin@tykobudo.com.au, or through the platform.
                </p>
              </section>

              <p>
                <strong>
                  By using this platform, you acknowledge and agree to this Privacy Policy.
                </strong>
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-700">
            <p className="text-sm text-gray-400 text-center">Last updated: 14th September 2025</p>
          </div>
        </div>
      </div>
    </div>
  )
}
