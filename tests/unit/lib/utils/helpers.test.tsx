import { describe, it, expect, vi, afterEach } from "vitest"
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

    it("should use crypto.randomUUID when available", () => {
      const mockRandomUUID = vi.fn(() => "12345678-1234-4123-8123-123456789abc")

      vi.stubGlobal("crypto", {
        randomUUID: mockRandomUUID,
      })

      const uuid = generateUUID()

      expect(uuid).toBe("12345678-1234-4123-8123-123456789abc")
      expect(mockRandomUUID).toHaveBeenCalledOnce()
    })

    it("should fallback to manual generation when crypto.randomUUID is unavailable", () => {
      vi.stubGlobal("crypto", {
        randomUUID: undefined,
      })

      const uuid = generateUUID()

      // Should match UUID v4 format
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    })

    it("should generate unique UUIDs using fallback", () => {
      vi.stubGlobal("crypto", {
        randomUUID: undefined,
      })

      const uuid1 = generateUUID()
      const uuid2 = generateUUID()

      expect(uuid1).not.toBe(uuid2)
      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
      expect(uuid2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    })
  })

  describe("sanitizeHtml", () => {
    it("should escape ampersand", () => {
      expect(sanitizeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry")
    })

    it("should escape less than", () => {
      expect(sanitizeHtml("1 < 2")).toBe("1 &lt; 2")
    })

    it("should escape greater than", () => {
      expect(sanitizeHtml("2 > 1")).toBe("2 &gt; 1")
    })

    it("should escape double quotes", () => {
      expect(sanitizeHtml('Say "hello"')).toBe("Say &quot;hello&quot;")
    })

    it("should escape single quotes", () => {
      expect(sanitizeHtml("It's working")).toBe("It&#039;s working")
    })

    it("should escape all special characters together", () => {
      const input = `<script>alert("XSS & 'attack'")</script>`
      const expected = `&lt;script&gt;alert(&quot;XSS &amp; &#039;attack&#039;&quot;)&lt;/script&gt;`
      expect(sanitizeHtml(input)).toBe(expected)
    })

    it("should prevent XSS with script tags", () => {
      const input = '<script>alert("XSS")</script>'
      const result = sanitizeHtml(input)
      expect(result).not.toContain("<script>")
      expect(result).not.toContain("</script>")
      expect(result).toBe("&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;")
    })

    it("should prevent XSS with event handlers", () => {
      const input = '<img src="x" onerror="alert(1)">'
      const result = sanitizeHtml(input)
      expect(result).not.toContain("onerror=")
      expect(result).toBe("&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;")
    })

    it("should prevent XSS with complex injection", () => {
      const input = `<div onclick="malicious()">Click me</div>`
      const result = sanitizeHtml(input)
      expect(result).not.toContain("<div")
      expect(result).not.toContain("onclick=")
      expect(result).toBe("&lt;div onclick=&quot;malicious()&quot;&gt;Click me&lt;/div&gt;")
    })

    it("should handle empty string", () => {
      expect(sanitizeHtml("")).toBe("")
    })

    it("should handle normal text without special characters", () => {
      const input = "Hello World"
      expect(sanitizeHtml(input)).toBe("Hello World")
    })

    it("should handle multiple special characters in sequence", () => {
      expect(sanitizeHtml("<>&\"'")).toBe("&lt;&gt;&amp;&quot;&#039;")
    })
  })
})
