"use client"

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ContributeModal from "@/components/contribute-modal"

describe("ContributeModal", () => {
  const mockOnClose = vi.fn()
  const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should not render when isOpen is false", () => {
    render(<ContributeModal isOpen={false} onClose={mockOnClose} />)

    expect(screen.queryByText(/contribute your videos/i)).toBeNull()
  })

  it("should render when isOpen is true", () => {
    render(<ContributeModal isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByText(/contribute your videos/i)).toBeTruthy()
  })

  it("should display title with Upload icon", () => {
    render(<ContributeModal isOpen={true} onClose={mockOnClose} />)

    const title = screen.getByText(/contribute your videos/i)
    const titleContainer = title.parentElement

    expect(titleContainer?.querySelector("svg")).toBeTruthy()
  })

  it("should display explanatory text about Google Drive", () => {
    render(<ContributeModal isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByText(/secure Google Drive folder/i)).toBeTruthy()
    expect(screen.getByText(/Send a message to the admin/i)).toBeTruthy()
    expect(screen.getByText(/If you already have permission/i)).toBeTruthy()
  })

  it("should render button with correct text", () => {
    render(<ContributeModal isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByRole("button", { name: /access google drive folder/i })).toBeTruthy()
    expect(screen.getByText(/share your training videos/i)).toBeTruthy()
  })

  it("should open Google Drive URL in new tab when button clicked", async () => {
    const user = userEvent.setup()

    render(<ContributeModal isOpen={true} onClose={mockOnClose} />)

    const button = screen.getByRole("button", { name: /access google drive folder/i })
    await user.click(button)

    expect(windowOpenSpy).toHaveBeenCalledWith(
      "https://drive.google.com/drive/folders/0BwMHmixA7yBXREJYa19LMy1zNnM?resourcekey=0-97Q651ce0-pVxCkxi8NddA",
      "_blank",
    )
  })

  it("should call onClose when dialog is closed", async () => {
    const user = userEvent.setup()

    render(<ContributeModal isOpen={true} onClose={mockOnClose} />)

    const closeButton = screen.getByRole("button", { name: /close/i })
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })
})
