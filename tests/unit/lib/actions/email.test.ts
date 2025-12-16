import { describe, it, expect, vi, beforeEach } from "vitest"
import { sendEmail } from "@/lib/actions/email"
import { Resend } from "resend"

// Mock Resend
vi.mock("resend", () => ({
  Resend: vi.fn(),
}))

describe("sendEmail", () => {
  let mockSend: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    mockSend = vi.fn()
    vi.mocked(Resend).mockImplementation(
      () =>
        ({
          emails: {
            send: mockSend,
          },
        }) as any,
    )

    process.env.RESEND_API_KEY = "test-api-key"
    process.env.ADMIN_EMAIL = "admin@test.com"
    process.env.NEXT_PUBLIC_FULL_SITE_URL = "https://test.example.com"
  })

  it("should successfully send an email with basic parameters", async () => {
    mockSend.mockResolvedValue({ error: null })

    await sendEmail("recipient@example.com", "Test Subject", "Test Title", "Test body content")

    expect(mockSend).toHaveBeenCalledWith({
      from: "OKL Admin <admin@test.com>",
      to: "recipient@example.com",
      bcc: undefined,
      subject: "Test Subject",
      html: expect.stringContaining("Test Title"),
    })
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("Test body content"),
      }),
    )
  })

  it("should send email with BCC recipients", async () => {
    mockSend.mockResolvedValue({ error: null })

    await sendEmail("recipient@example.com", "Test Subject", "Test Title", "Test body", [
      "bcc1@example.com",
      "bcc2@example.com",
    ])

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        bcc: ["bcc1@example.com", "bcc2@example.com"],
      }),
    )
  })

  it("should convert newlines to HTML breaks in body", async () => {
    mockSend.mockResolvedValue({ error: null })

    await sendEmail("recipient@example.com", "Test Subject", "Test Title", "Line 1\nLine 2\nLine 3")

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("Line 1<br>Line 2<br>Line 3"),
      }),
    )
  })

  it("should include correct email template structure", async () => {
    mockSend.mockResolvedValue({ error: null })

    await sendEmail("recipient@example.com", "Test Subject", "Test Title", "Test body")

    const htmlArg = mockSend.mock.calls[0][0].html
    expect(htmlArg).toContain("Okinawa Kobudo Library")
    expect(htmlArg).toContain("Matayoshi/Okinawa Kobudo Australia Video Library")
    expect(htmlArg).toContain("https://test.example.com")
  })

  it("should throw error when Resend returns an error", async () => {
    mockSend.mockResolvedValue({
      error: { message: "Invalid API key" },
    })

    await expect(sendEmail("recipient@example.com", "Test Subject", "Test Title", "Test body")).rejects.toThrow(
      "Failed to send email",
    )
  })

  it("should throw error when Resend throws an exception", async () => {
    mockSend.mockRejectedValue(new Error("Network error"))

    await expect(sendEmail("recipient@example.com", "Test Subject", "Test Title", "Test body")).rejects.toThrow(
      "Network error",
    )
  })

  it("should use correct environment variables", async () => {
    mockSend.mockResolvedValue({ error: null })

    await sendEmail("recipient@example.com", "Test Subject", "Test Title", "Test body")

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "OKL Admin <admin@test.com>",
      }),
    )

    const htmlArg = mockSend.mock.calls[0][0].html
    expect(htmlArg).toContain("https://test.example.com")
  })
})
