import { describe, it, expect, afterEach, vi } from "vitest"
import { siteTitle, generateUUID, sanitizeHtml } from "@/lib/utils/helpers"

describe("helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe("siteTitle", () => {
    it("should export the correct site title", () => {
      expect(siteTitle).toBe("Okinawa Kobudo Library")
    })
  })

  describe("generateUUID", () => {
    it("should generate UUID using crypto.randomUUID when available", () => {
      const mockUUID = "550e8400-e29b-41d4-a716-446655440000"
      vi.stubGlobal("crypto", {
        randomUUID: vi.fn(() => mockUUID),
      })

      const result = generateUUID()
      expect(result).toBe(mockUUID)
    })

    it("should fallback to Math.random when crypto is not available", () => {
      vi.stubGlobal("crypto", undefined)

      const result = generateUUID()
      // Check UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    })

    it("should generate unique UUIDs on subsequent calls", () => {
      vi.stubGlobal("crypto", undefined)

      const uuid1 = generateUUID()
      const uuid2 = generateUUID()
      const uuid3 = generateUUID()

      expect(uuid1).not.toBe(uuid2)
      expect(uuid2).not.toBe(uuid3)
      expect(uuid1).not.toBe(uuid3)
    })
  })

  describe("sanitizeHtml", () => {
    it("should escape ampersands", () => {
      expect(sanitizeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry")
    })

    it("should escape less than signs", () => {
      expect(sanitizeHtml("5 < 10")).toBe("5 &lt; 10")
    })

    it("should escape greater than signs", () => {
      expect(sanitizeHtml("10 > 5")).toBe("10 &gt; 5")
    })

    it("should escape double quotes", () => {
      expect(sanitizeHtml('Say "hello"')).toBe("Say &quot;hello&quot;")
    })

    it("should escape single quotes", () => {
      expect(sanitizeHtml("It's working")).toBe("It&#x27;s working")
    })

    it("should escape all special characters together", () => {
      const input = `<>&"'`
      expect(sanitizeHtml(input)).toBe("&lt;&gt;&amp;&quot;&#x27;")
    })

    it("should prevent script tag XSS", () => {
      const malicious = '<script>alert("XSS")</script>'
      const result = sanitizeHtml(malicious)
      expect(result).toBe("&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;")
      expect(result).not.toContain("<script>")
    })

    it("should prevent onerror XSS", () => {
      const malicious = '<img src="x" onerror="alert(1)">'
      const result = sanitizeHtml(malicious)
      expect(result).toBe("&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;")
      expect(result).not.toContain("<img")
    })

    it("should prevent onclick XSS", () => {
      const malicious = '<div onclick="malicious()">Click me</div>'
      const result = sanitizeHtml(malicious)
      expect(result).toBe("&lt;div onclick=&quot;malicious()&quot;&gt;Click me&lt;/div&gt;")
      expect(result).not.toContain("<div")
    })

    it("should handle empty strings", () => {
      expect(sanitizeHtml("")).toBe("")
    })

    it("should not modify normal text without special characters", () => {
      const normalText = "This is a normal sentence."
      expect(sanitizeHtml(normalText)).toBe(normalText)
    })

    it("should handle complex HTML injection attempts", () => {
      const complex = '<a href="javascript:void(0)" onclick="alert(\'XSS\')">Link</a>'
      const result = sanitizeHtml(complex)
      expect(result).toContain("&lt;a")
      expect(result).toContain("&gt;")
      expect(result).toContain("&quot;")
      expect(result).toContain("&#x27;")
      expect(result).not.toContain("<a")
      expect(result).not.toContain("javascript:")
    })
  })
})
