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

  it("should display deployment date", () => {
    render(<AboutModal isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByText(/Deployed:/i)).toBeTruthy()
  })



  it("should display development build text when no timestamp is set", () => {
    render(<AboutModal isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByText(/Development Build/i)).toBeTruthy()
  })
})
