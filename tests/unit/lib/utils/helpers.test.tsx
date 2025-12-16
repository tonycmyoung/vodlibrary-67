import { sanitizeHtml } from "./helpers" // Declare the variable before using it

describe("sanitizeHtml", () => {

    it("should prevent onerror XSS", () => {
      const malicious = '<img src="x" onerror="alert(1)">';
      const result = sanitizeHtml(malicious);
      expect(result).toBe('&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;');
      expect(result).not.toContain("<img");
      expect(result).not.toContain("alert(1)\">");
    });

    it("should prevent onclick XSS", () => {
      const malicious = '<div onclick="malicious()">Click me</div>';
      const result = sanitizeHtml(malicious);
      expect(result).toBe('&lt;div onclick=&quot;malicious()&quot;&gt;Click me&lt;/div&gt;');
      expect(result).not.toContain("<div");
      expect(result).not.toContain("malicious()\">");
    });

    it("should escape all special characters together", () => {
      const input = `<>&"'`;
      expect(sanitizeHtml(input)).toBe("&lt;&gt;&amp;&quot;&#x27;");
    });
