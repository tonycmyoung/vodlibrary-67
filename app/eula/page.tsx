import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "End User License Agreement | Okinawa Kobudo Library",
  description: "End User License Agreement for Okinawa Kobudo Library video platform",
}

export default function EULAPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-orange-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 p-8">
          <h1 className="text-3xl font-bold text-white mb-8 text-center">End User License Agreement</h1>

          <div className="prose prose-slate dark:prose-invert max-w-none">
            <div className="space-y-6 text-gray-300 leading-relaxed">
              <p className="text-lg font-medium text-white">Okinawa Kobudo Library - Video Platform Terms of Use</p>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
                <p>
                  This End User License Agreement (“Agreement”) is between TY Kobudo (“Provider”, “we”, “us”, “our”) and
                  the end user (“User”, “you”, “your”) regarding your use of the Okinawa Kobudo Library platform
                  (“Service”). By registering for, accessing, or using this Service, you agree to the terms of this
                  Agreement.{" "}
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">2. License Grant</h2>
                <p>
                  Provider grants you a limited, non-exclusive, non-transferable, revocable license to access and
                  personally use the video library and associated materials strictly for your individual, non-commercial
                  educational purposes as a member of the authorized group.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">3. Restrictions</h2>
                <p>You must NOT:</p>
                <ul className="list-disc list-inside ml-6">
                  <li>
                    Download, copy, screen-record, reproduce, republish, upload, distribute, or transmit any part of the
                    video content or underlying platform, except as expressly permitted by Provider;
                  </li>
                  <li>Share your account or login credentials with others;</li>
                  <li>
                    Attempt to reverse-engineer, circumvent protections, or otherwise compromise the security or access
                    controls of the Service;
                  </li>
                  <li>Use the Service or any content therein for commercial purposes.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">4. User Obligations</h2>
                <p>
                  You agree to provide accurate information during registration, including your name, email address,
                  school/dojo, and teacher’s name, and to keep this information up to date at all times. You will
                  maintain confidentiality and security of login credentials and will report unauthorized use
                  immediately.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">5. Intellectual Property</h2>
                <p>
                  All video, written, and photographic content, unless otherwise stated, is owned by TY Kobudo or
                  licensed to us, and is protected by copyright and other laws. Use of the Service grants no ownership
                  rights to you.
                  <br />
                  <strong>Copyright Notice:</strong> Copyright © 2025 Tony Young. All Rights Reserved. No videos or
                  other content on this platform may be reproduced or redistributed in any form without explicit written
                  permission from the Provider.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">6. Recorded with Permission</h2>
                <p>
                  All performances depicted in the platform’s videos have been recorded and shared with the explicit
                  consent of the individuals featured.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">7. Privacy and Data Collection</h2>
                <p>
                  We collect and use your personal information only for the administration of access to this educational
                  resource. For more information, see our{" "}
                  <Link href="/privacy-policy" className="text-gray-200 hover:text-white transition-colors underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">8. Modifications and Updates</h2>
                <p>
                  Provider reserves the right to modify, update, or discontinue access to the Service at any time
                  without prior notice.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">9. Warranty Disclaimer</h2>
                <p>
                  The Service and content are provided “as is” and “as available”, without warranties of any kind.
                  Provider disclaims all warranties unless required by applicable law.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">10. Limitation of Liability</h2>
                <p>
                  To the extent permitted by law, Provider is not liable for any direct, indirect, incidental, special,
                  or consequential damages resulting from use or inability to use the Service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">11. Indemnification</h2>
                <p>
                  You agree to indemnify and hold harmless Provider from any loss, liability, or claim arising from your
                  violation of this Agreement or misuse of the Service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">12. Termination</h2>
                <p>
                  Provider may suspend or terminate your access for violation of this Agreement or other misconduct, at
                  its sole discretion.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">13. Governing Law</h2>
                <p>
                  This Agreement is governed by the laws of State of New South Wales, Australia, excluding its conflict
                  of laws principles.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">14. Changes to The Agreement</h2>
                <p>
                  Provider may update this Agreement from time to time. Continued use of the Service by you will signify
                  acceptance of the revised Agreement.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">15. Contact Information</h2>
                <p>
                  For questions or requests regarding this Agreement, contact us via email at admin@tykobudo.com.au, or
                  through the platform.
                </p>
              </section>

              <p>
                <strong>By using this platform, you acknowledge and agree to this Agreement.</strong>
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
