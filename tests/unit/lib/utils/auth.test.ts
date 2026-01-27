import { describe, it, expect } from "vitest"
import { validateReturnTo, getAuthErrorMessage } from "@/lib/utils/auth"

describe("Auth Utilities", () => {
  describe("validateReturnTo", () => {
    it("should accept valid relative paths", () => {
      expect(validateReturnTo("/videos")).toBe("/videos")
      expect(validateReturnTo("/profile")).toBe("/profile")
      expect(validateReturnTo("/videos/123")).toBe("/videos/123")
    })

    it("should accept paths with query parameters", () => {
      expect(validateReturnTo("/videos?category=bo")).toBe("/videos?category=bo")
    })

    it("should accept paths with hash fragments", () => {
      expect(validateReturnTo("/videos#section")).toBe("/videos#section")
    })

    it("should reject null input", () => {
      expect(validateReturnTo(null)).toBeNull()
    })

    it("should reject undefined input", () => {
      expect(validateReturnTo(undefined)).toBeNull()
    })

    it("should reject non-string input", () => {
      expect(validateReturnTo(123 as any)).toBeNull()
    })

    it("should reject paths not starting with /", () => {
      expect(validateReturnTo("videos")).toBeNull()
      expect(validateReturnTo("http://example.com")).toBeNull()
    })

    it("should reject paths with protocol", () => {
      expect(validateReturnTo("https://example.com/videos")).toBeNull()
      expect(validateReturnTo("http://example.com/videos")).toBeNull()
    })

    it("should reject paths with double slashes (protocol-relative)", () => {
      expect(validateReturnTo("//example.com/videos")).toBeNull()
    })

    it("should reject root path", () => {
      expect(validateReturnTo("/")).toBeNull()
    })

    it("should reject auth paths", () => {
      expect(validateReturnTo("/auth/login")).toBeNull()
      expect(validateReturnTo("/auth/sign-up")).toBeNull()
      expect(validateReturnTo("/auth/callback")).toBeNull()
      expect(validateReturnTo("/auth/confirm")).toBeNull()
      expect(validateReturnTo("/auth/reset-password")).toBeNull()
    })

    it("should reject admin paths", () => {
      expect(validateReturnTo("/admin/users")).toBeNull()
      expect(validateReturnTo("/admin/videos")).toBeNull()
    })

    it("should reject api paths", () => {
      expect(validateReturnTo("/api/videos")).toBeNull()
      expect(validateReturnTo("/api/auth")).toBeNull()
    })

    it("should reject excluded exact paths", () => {
      expect(validateReturnTo("/pending-approval")).toBeNull()
      expect(validateReturnTo("/setup-admin")).toBeNull()
    })

    it("should reject URL-encoded domain-like paths", () => {
      expect(validateReturnTo("%2Fwww.")).toBeNull()
      expect(validateReturnTo("%2Fwww.example.com")).toBeNull()
      expect(validateReturnTo("%2Ftykobudo.com.au")).toBeNull()
    })

    it("should reject paths containing www.", () => {
      expect(validateReturnTo("/www.example.com")).toBeNull()
      expect(validateReturnTo("/www.")).toBeNull()
      expect(validateReturnTo("www.tykobudo.com")).toBeNull()
    })

    it("should reject paths that look like domains", () => {
      expect(validateReturnTo("/example.com")).toBeNull()
      expect(validateReturnTo("/tykobudo.com.au")).toBeNull()
    })

    it("should handle invalid URL encoding gracefully", () => {
      expect(validateReturnTo("%")).toBeNull()
      expect(validateReturnTo("%ZZ")).toBeNull()
    })

    it("should accept valid URL-encoded paths and return decoded value", () => {
      expect(validateReturnTo("%2Fvideos")).toBe("/videos")
      expect(validateReturnTo("%2Fvideo%2F123")).toBe("/video/123")
    })
  })

  describe("getAuthErrorMessage", () => {
    it("should return null for null input", () => {
      expect(getAuthErrorMessage(null)).toBeNull()
    })

    it("should return null for undefined input", () => {
      expect(getAuthErrorMessage(undefined)).toBeNull()
    })

    it("should return correct message for invalid_credentials", () => {
      expect(getAuthErrorMessage("invalid_credentials")).toBe(
        "Invalid email or password. Please check your credentials and try again.",
      )
    })

    it("should return correct message for email_not_confirmed", () => {
      expect(getAuthErrorMessage("email_not_confirmed")).toBe(
        "Please check your email and click the confirmation link before signing in.",
      )
    })

    it("should return correct message for invalid_return_path", () => {
      expect(getAuthErrorMessage("invalid_return_path")).toBe("Invalid redirect destination. Please try again.")
    })

    it("should return correct message for auth_error", () => {
      expect(getAuthErrorMessage("auth_error")).toBe("An authentication error occurred. Please try again.")
    })

    it("should return correct message for reset_expired", () => {
      expect(getAuthErrorMessage("reset_expired")).toBe(
        "Your password reset link has expired or is invalid. Please request a new one.",
      )
    })

    it("should return generic message for unknown error code", () => {
      expect(getAuthErrorMessage("unknown_error")).toBe("An unexpected error occurred. Please try again.")
    })

    it("should return generic message for empty string", () => {
      expect(getAuthErrorMessage("")).toBeNull()
    })
  })
})
