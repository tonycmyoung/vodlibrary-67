import Link from "next/link"

export function LegalFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-700/50 mt-auto bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-white">© {currentYear} Tony Young. All rights reserved.</div>

          <div className="flex items-center gap-6 text-sm">
            <Link href="/eula" className="text-gray-200 hover:text-white transition-colors underline">
              End User License Agreement
            </Link>
            <Link href="/privacy-notice" className="text-gray-200 hover:text-white transition-colors underline">
              Privacy Notice
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
