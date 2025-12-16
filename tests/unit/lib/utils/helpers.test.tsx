import { describe, it, expect, afterEach, vi } from "vitest"
import { siteTitle, generateUUID, sanitizeHtml } from "@/lib/utils/helpers"

describe("helpers", () => {
  describe("siteTitle", () => {
    it("should export the correct site title", () => {
      expect(siteTitle).toBe("Okinawa Kobudo Library")
    })
  })

  describe("generateUUID", () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it("should generate a valid UUID using crypto.randomUUID when available", () => {
      const mockUUID = "550e8400-e29b-41d4-a716-446655440000"
      vi.stubGlobal("crypto", {
        randomUUID: vi.fn().mockReturnValue(mockUUID),
      })

      const result = generateUUID()
      expect(result).toBe(mockUUID)
    })

    it("should generate a valid UUID format using fallback when crypto is unavailable", () => {
      vi.stubGlobal("crypto", undefined)

      const result = generateUUID()
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(result).toMatch(uuidRegex)
    })

    it("should generate unique UUIDs with fallback", () => {
      vi.stubGlobal("crypto", undefined)

      const uuid1 = generateUUID()
      const uuid2 = generateUUID()
      expect(uuid1).not.toBe(uuid2)
    })
  })

  describe("sanitizeHtml", () => {
    it("should escape ampersands", () => {
      expect(sanitizeHtml("A & B")).toBe("A &amp; B")
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
      const input = `<script>alert("XSS & 'attack'")</script>`
      const expected = `&lt;script&gt;alert(&quot;XSS &amp; &#x27;attack&#x27;&quot;)&lt;/script&gt;`
      expect(sanitizeHtml(input)).toBe(expected)
    })

    it("should prevent XSS with script tags", () => {
      const input = '<script>alert("XSS")</script>'
      const result = sanitizeHtml(input)
      expect(result).toContain("&lt;script&gt;")
      expect(result).toContain("&lt;/script&gt;")
    })

    it("should prevent XSS with event handlers", () => {
      const input = '<img onerror="alert(1)" />'
      const result = sanitizeHtml(input)
      expect(result).toContain("&lt;img")
      expect(result).toContain("&gt;")
      expect(result).toContain("&quot;")
    })

    it("should prevent XSS with onclick handlers", () => {
      const input = '<div onclick="malicious()">Click</div>'
      const result = sanitizeHtml(input)
      expect(result).toContain("&lt;div")
      expect(result).toContain("&gt;")
      expect(result).toContain("&quot;")
    })

    it("should handle empty strings", () => {
      expect(sanitizeHtml("")).toBe("")
    })

    it("should not modify safe text", () => {
      const safeText = "This is normal text without special characters"
      expect(sanitizeHtml(safeText)).toBe(safeText)
    })

    it("should handle complex XSS attempts", () => {
      const input = '<a href="javascript:alert(1)">link</a>'
      const result = sanitizeHtml(input)
      expect(result).toContain("&lt;a")
      expect(result).toContain("&gt;")
      expect(result).toContain("&quot;")
    })
  })
})
