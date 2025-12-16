import { sanitizeHtml } from "../../lib/utils/helpers" // Declare or import the sanitizeHtml function

describe("sanitizeHtml", () => {
  it("should handle complex HTML injection attempts", () => {
    const malicious = '<a href="javascript:void(0)" onclick="alert(\'XSS\')">Link</a>'
    const result = sanitizeHtml(malicious)

    expect(result).toContain("&lt;a") // <a is escaped
    expect(result).toContain("&quot;") // quotes are escaped
    expect(result).toContain("&#x27;") // single quotes are escaped
    expect(result).not.toContain("<a") // no actual HTML tags
    // "javascript:" will still appear as text in the escaped output, which is safe
  })
})
