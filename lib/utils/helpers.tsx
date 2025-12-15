const siteTitle = "Okinawa Kobudo Library"

export function generateUUID() {
  // Use Web Crypto API if available (modern browsers and Node.js 16+)
  if (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  // Fallback UUID v4 generation for older environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c == "x" ? Math.trunc(r) : Math.trunc((r & 0x3) | 0x8)
    return v.toString(16)
  })
}

export function sanitizeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
}

export { siteTitle }
