import { describe, it, expect, vi } from "vitest"
import { generateUUID, sanitizeHtml, siteTitle } from "@/lib/utils/helpers"

describe("helpers", () => {
  describe("siteTitle", () => {
    it("should export the correct site title", () => {
      expect(siteTitle).toBe("Okinawa Kobudo Library")
    })
  })

  describe("generateUUID", () => {
    it("should generate a valid UUID v4 format using crypto API", () => {
      const uuid = generateUUID()

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

      expect(uuid).toMatch(uuidRegex)
    })

    it("should generate unique UUIDs on consecutive calls", () => {
      const uuid1 = generateUUID()
      const uuid2 = generateUUID()
      const uuid3 = generateUUID()

      expect(uuid1).not.toBe(uuid2)
      expect(uuid2).not.toBe(uuid3)
      expect(uuid1).not.toBe(uuid3)
    })

    it("should use crypto.randomUUID when available", () => {
      // Verify the native crypto API is being used
      const originalCrypto = globalThis.crypto
      const mockRandomUUID = vi.fn(() => "12345678-1234-4123-8123-123456789abc")

      globalThis.crypto = {
        ...originalCrypto,
        randomUUID: mockRandomUUID,
      } as any

      const uuid = generateUUID()

      expect(mockRandomUUID).toHaveBeenCalled()
      expect(uuid).toBe("12345678-1234-4123-8123-123456789abc")

      // Restore
      globalThis.crypto = originalCrypto
    })

    it("should fallback to manual generation when crypto.randomUUID is unavailable", () => {
      const originalCrypto = globalThis.crypto

      // Remove crypto.randomUUID
      globalThis.crypto = {
        ...originalCrypto,
        randomUUID: undefined,
      } as any

      const uuid = generateUUID()

      // Should still generate a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(uuid).toMatch(uuidRegex)

      // Restore
      globalThis.crypto = originalCrypto
    })
  })

  describe("sanitizeHtml", () => {
    it("should escape ampersands", () => {
      expect(sanitizeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry")
      expect(sanitizeHtml("A & B & C")).toBe("A &amp; B &amp; C")
    })

    it("should escape less-than signs", () => {
      expect(sanitizeHtml("<script>")).toBe("&lt;script&gt;")
      expect(sanitizeHtml("5 < 10")).toBe("5 &lt; 10")
    })

    it("should escape greater-than signs", () => {
      expect(sanitizeHtml("</script>")).toBe("&lt;/script&gt;")
      expect(sanitizeHtml("10 > 5")).toBe("10 &gt; 5")
    })

    it("should escape double quotes", () => {
      expect(sanitizeHtml('Hello "World"')).toBe("Hello &quot;World&quot;")
    })

    it("should escape single quotes", () => {
      expect(sanitizeHtml("It's working")).toBe("It&#x27;s working")
    })

    it("should escape multiple special characters", () => {
      const input = "<a href=\"javascript:alert('XSS')\">Click</a>"
      const expected = "&lt;a href=&quot;javascript:alert(&#x27;XSS&#x27;)&quot;&gt;Click&lt;/a&gt;"

      expect(sanitizeHtml(input)).toBe(expected)
    })

    it("should handle empty string", () => {
      expect(sanitizeHtml("")).toBe("")
    })

    it("should handle strings with no special characters", () => {
      expect(sanitizeHtml("Hello World")).toBe("Hello World")
      expect(sanitizeHtml("123 456")).toBe("123 456")
    })

    it("should escape all special characters in complex HTML injection attempt", () => {
      const maliciousInput = "<script>alert('XSS')</script><img src=\"x\" onerror=\"alert('XSS')\">"
      const sanitized = sanitizeHtml(maliciousInput)

      expect(sanitized).not.toContain("<script>")
      expect(sanitized).not.toContain("</script>")
      expect(sanitized).not.toContain("<img")
      expect(sanitized).toContain("&lt;")
      expect(sanitized).toContain("&gt;")
      expect(sanitized).toContain("&quot;")
      expect(sanitized).toContain("&#x27;")
    })

    it("should preserve text content while escaping HTML", () => {
      const input = "User input: <b>Bold & Italic</b>"
      const sanitized = sanitizeHtml(input)

      expect(sanitized).toContain("User input:")
      expect(sanitized).toContain("Bold &amp; Italic")
      expect(sanitized).not.toContain("<b>")
    })
  })
})
