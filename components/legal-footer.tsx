import Link from "next/link"

export function LegalFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-700/50 mt-auto bg-gradient-to-br from-gray-900 via-red-900 to-orange-900">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-300">© {currentYear} Tony Young. All rights reserved.</div>

          <div className="flex items-center gap-6 text-sm">
            <Link href="/eula" className="text-gray-300 hover:text-white transition-colors">
              End User License Agreement
            </Link>
            <Link href="/privacy-notice" className="text-gray-300 hover:text-white transition-colors">
              Privacy Notice
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
