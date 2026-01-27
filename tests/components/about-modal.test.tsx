"use client"

import type React from "react"

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import AboutModal from "@/components/about-modal"

// Mock the Dialog component
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

describe("AboutModal", () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  it("should not render when isOpen is false", () => {
    render(<AboutModal isOpen={false} onClose={mockOnClose} />)
    expect(screen.queryByText(/About/i)).toBeNull()
  })

  it("should render when isOpen is true", () => {
    render(<AboutModal isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByText(/About/i)).toBeTruthy()
  })

  it("should display site name", () => {
    render(<AboutModal isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByText(/Okinawa Kobudo/i)).toBeTruthy()
    expect(screen.getByText(/Training Video Library/i)).toBeTruthy()
  })

  it("should display creator information", () => {
    render(<AboutModal isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByText(/Tony Young/i)).toBeTruthy()
    expect(screen.getByText(/Copyright 2025-2026/i)).toBeTruthy()
  })

  it("should display deployment info section", () => {
    render(<AboutModal isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByText(/Deployment Info/i)).toBeTruthy()
    expect(screen.getByText(/Version/i)).toBeTruthy()
    expect(screen.getByText(/Built/i)).toBeTruthy()
    expect(screen.getByText(/Branch/i)).toBeTruthy()
    expect(screen.getByText(/Commit/i)).toBeTruthy()
  })

  it("should have a close button", () => {
    render(<AboutModal isOpen={true} onClose={mockOnClose} />)
    const closeButton = screen.getByRole("button", { name: /close/i })
    expect(closeButton).toBeTruthy()
  })

  it("should call onClose when Close button is clicked", () => {
    render(<AboutModal isOpen={true} onClose={mockOnClose} />)
    const closeButton = screen.getByRole("button", { name: /close/i })

    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("should display version number", () => {
    render(<AboutModal isOpen={true} onClose={mockOnClose} />)
    // Should show default version or env variable
    const versionElements = screen.getAllByText(/0\.1\.0|local/i)
    expect(versionElements.length).toBeGreaterThan(0)
  })
})
