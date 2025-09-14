export function LegalFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-700/50 mt-auto bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-white">© {currentYear} Tony Young. All rights reserved.</div>

          <div className="flex items-center gap-6 text-sm">
            <a
              href="/eula"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-200 hover:text-white transition-colors underline"
            >
              End User License Agreement
            </a>
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-200 hover:text-white transition-colors underline"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
