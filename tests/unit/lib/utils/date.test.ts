import { describe, it, expect, beforeEach, vi } from "vitest"
import { formatDate, formatShortDate, formatTimeAgo, formatMonth } from "@/lib/utils/date"

describe("Date Utilities", () => {
  describe("formatDate", () => {
    it("should format a valid ISO date string with timezone", () => {
      const result = formatDate("2024-01-15T14:30:00Z")
      expect(result).toMatch(/Jan 15, 2024/)
    })

    it("should format a valid ISO date string without timezone by adding Z", () => {
      const result = formatDate("2024-01-15T14:30:00")
      expect(result).toMatch(/Jan 15, 2024/)
    })

    it("should handle date string with positive timezone offset", () => {
      const result = formatDate("2024-01-15T14:30:00+05:00")
      expect(result).toMatch(/Jan 15, 2024/)
    })

    it("should handle date string with negative timezone offset", () => {
      const result = formatDate("2024-01-15T14:30:00-05:00")
      expect(result).toMatch(/Jan 15, 2024/)
    })

    it("should return 'No date' for null input", () => {
      expect(formatDate(null)).toBe("No date")
    })

    it("should return 'No date' for undefined input", () => {
      expect(formatDate(undefined)).toBe("No date")
    })

    it("should return 'No date' for empty string", () => {
      expect(formatDate("")).toBe("No date")
    })

    it("should return 'No date' for whitespace string", () => {
      expect(formatDate("   ")).toBe("No date")
    })

    it("should return 'Invalid date' for invalid date string", () => {
      expect(formatDate("not-a-date")).toBe("Invalid date")
    })

    it("should return 'Invalid date' for malformed ISO string", () => {
      expect(formatDate("2024-13-45T99:99:99Z")).toBe("Invalid date")
    })
  })

  describe("formatShortDate", () => {
    it("should format a valid ISO date string to short date", () => {
      const result = formatShortDate("2024-01-15T14:30:00Z")
      expect(result).toBe("Jan 15, 2024")
    })

    it("should format date without timezone by adding Z", () => {
      const result = formatShortDate("2024-01-15T14:30:00")
      expect(result).toBe("Jan 15, 2024")
    })

    it("should handle date string with timezone offset", () => {
      const result = formatShortDate("2024-01-15T14:30:00+05:00")
      expect(result).toBe("Jan 15, 2024")
    })

    it("should return 'No date' for null input", () => {
      expect(formatShortDate(null)).toBe("No date")
    })

    it("should return 'No date' for undefined input", () => {
      expect(formatShortDate(undefined)).toBe("No date")
    })

    it("should return 'No date' for empty string", () => {
      expect(formatShortDate("")).toBe("No date")
    })

    it("should return 'Invalid date' for invalid date string", () => {
      expect(formatShortDate("invalid")).toBe("Invalid date")
    })
  })

  describe("formatTimeAgo", () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2024-01-15T12:00:00Z"))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("should return 'just now' for very recent dates", () => {
      const result = formatTimeAgo("2024-01-15T11:59:30Z")
      expect(result).toBe("just now")
    })

    it("should return minutes ago for dates within an hour", () => {
      const result = formatTimeAgo("2024-01-15T11:45:00Z")
      expect(result).toBe("15 minutes ago")
    })

    it("should return hours ago for dates within a day", () => {
      const result = formatTimeAgo("2024-01-15T09:00:00Z")
      expect(result).toBe("3 hours ago")
    })

    it("should return days ago for dates within a month", () => {
      const result = formatTimeAgo("2024-01-10T12:00:00Z")
      expect(result).toBe("5 days ago")
    })

    it("should return months ago for older dates", () => {
      const result = formatTimeAgo("2023-10-15T12:00:00Z")
      expect(result).toBe("3 months ago")
    })

    it("should handle date without timezone", () => {
      const result = formatTimeAgo("2024-01-15T11:45:00")
      expect(result).toBe("15 minutes ago")
    })

    it("should return 'No date' for null input", () => {
      expect(formatTimeAgo(null)).toBe("No date")
    })

    it("should return 'No date' for undefined input", () => {
      expect(formatTimeAgo(undefined)).toBe("No date")
    })

    it("should return 'No date' for empty string", () => {
      expect(formatTimeAgo("")).toBe("No date")
    })

    it("should return 'Invalid date' for invalid date string", () => {
      expect(formatTimeAgo("not-a-date")).toBe("Invalid date")
    })
  })

  describe("formatMonth", () => {
    it("should format January correctly", () => {
      const date = new Date("2024-01-15")
      expect(formatMonth(date)).toBe("Jan")
    })

    it("should format December correctly", () => {
      const date = new Date("2024-12-15")
      expect(formatMonth(date)).toBe("Dec")
    })

    it("should format any month correctly", () => {
      const date = new Date("2024-06-15")
      expect(formatMonth(date)).toBe("Jun")
    })
  })
})
