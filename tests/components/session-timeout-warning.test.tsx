import type React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import SessionTimeoutWarning from "@/components/session-timeout-warning"

// Mock Supabase client
const mockGetSession = vi.fn()
const mockRefreshSession = vi.fn()

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: mockGetSession,
      refreshSession: mockRefreshSession,
    },
  })),
}))

// Mock the Dialog component
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe("SessionTimeoutWarning", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should not show warning when session has more than 5 minutes", async () => {
    const futureTime = Math.floor(Date.now() / 1000) + 600 // 10 minutes
    mockGetSession.mockResolvedValue({
      data: { session: { expires_at: futureTime } },
      error: null,
    })

    render(<SessionTimeoutWarning userId="user-123" />)

    await waitFor(() => {
      expect(screen.queryByText(/session expiring soon/i)).not.toBeInTheDocument()
    })
  })

  it("should show warning when session has less than 5 minutes", async () => {
    const futureTime = Math.floor(Date.now() / 1000) + 200 // 3 minutes 20 seconds
    mockGetSession.mockResolvedValue({
      data: { session: { expires_at: futureTime } },
      error: null,
    })

    render(<SessionTimeoutWarning userId="user-123" />)

    await waitFor(
      () => {
        expect(screen.getByText(/session expiring soon/i)).toBeInTheDocument()
      },
      { timeout: 32000 },
    ) // Component checks every 30 seconds
  })

  it("should display countdown timer", async () => {
    const futureTime = Math.floor(Date.now() / 1000) + 200
    mockGetSession.mockResolvedValue({
      data: { session: { expires_at: futureTime } },
      error: null,
    })

    render(<SessionTimeoutWarning userId="user-123" />)

    await waitFor(
      () => {
        // Should show time in m:ss format (3:20)
        expect(screen.getByText(/3:20/)).toBeInTheDocument()
      },
      { timeout: 32000 },
    )
  })

  it("should have Extend Session button", async () => {
    const futureTime = Math.floor(Date.now() / 1000) + 200
    mockGetSession.mockResolvedValue({
      data: { session: { expires_at: futureTime } },
      error: null,
    })

    render(<SessionTimeoutWarning userId="user-123" />)

    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: /extend session/i })).toBeInTheDocument()
      },
      { timeout: 32000 },
    )
  })

  it("should call refreshSession when Extend Session is clicked", async () => {
    const futureTime = Math.floor(Date.now() / 1000) + 200
    mockGetSession.mockResolvedValue({
      data: { session: { expires_at: futureTime } },
      error: null,
    })
    mockRefreshSession.mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    })

    render(<SessionTimeoutWarning userId="user-123" />)

    await waitFor(
      async () => {
        const extendButton = screen.getByRole("button", { name: /extend session/i })
        fireEvent.click(extendButton)

        await waitFor(() => {
          expect(mockRefreshSession).toHaveBeenCalled()
        })
      },
      { timeout: 32000 },
    )
  })

  it("should hide warning after successful refresh", async () => {
    const futureTime = Math.floor(Date.now() / 1000) + 200
    mockGetSession.mockResolvedValue({
      data: { session: { expires_at: futureTime } },
      error: null,
    })
    mockRefreshSession.mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    })

    render(<SessionTimeoutWarning userId="user-123" />)

    await waitFor(
      async () => {
        const extendButton = screen.getByRole("button", { name: /extend session/i })
        fireEvent.click(extendButton)

        await waitFor(() => {
          expect(screen.queryByText(/session expiring soon/i)).not.toBeInTheDocument()
        })
      },
      { timeout: 35000 },
    )
  })

  it("should not render when userId is undefined", () => {
    render(<SessionTimeoutWarning userId="undefined" />)

    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument()
  })
})
