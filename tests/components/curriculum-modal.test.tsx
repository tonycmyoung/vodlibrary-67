"use client"

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import CurriculumModal from "@/components/curriculum-modal"

describe("CurriculumModal", () => {
  const mockOnClose = vi.fn()
  const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should not render when isOpen is false", () => {
    render(<CurriculumModal isOpen={false} onClose={mockOnClose} />)

    expect(screen.queryByText(/curriculum resources/i)).not.toBeInTheDocument()
  })

  it("should render when isOpen is true", () => {
    render(<CurriculumModal isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByText(/curriculum resources/i)).toBeInTheDocument()
  })

  it("should display title with Award icon", () => {
    render(<CurriculumModal isOpen={true} onClose={mockOnClose} />)

    const title = screen.getByText(/curriculum resources/i)
    const titleContainer = title.parentElement

    expect(titleContainer?.querySelector("svg")).toBeInTheDocument()
  })

  it("should display descriptive text", () => {
    render(<CurriculumModal isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByText(/Access important curriculum documents/i)).toBeInTheDocument()
  })

  it("should render Belt Requirements button", () => {
    render(<CurriculumModal isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByRole("button", { name: /belt requirements/i })).toBeInTheDocument()
    expect(screen.getByText(/training progression guidelines/i)).toBeInTheDocument()
  })

  it("should render Kobudo Manual button", () => {
    render(<CurriculumModal isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByRole("button", { name: /kobudo manual/i })).toBeInTheDocument()
    expect(screen.getByText(/complete training manual/i)).toBeInTheDocument()
  })

  it("should open Belt Requirements URL in new tab when clicked", async () => {
    const user = userEvent.setup()

    render(<CurriculumModal isOpen={true} onClose={mockOnClose} />)

    const button = screen.getByRole("button", { name: /belt requirements/i })
    await user.click(button)

    expect(windowOpenSpy).toHaveBeenCalledWith(
      "https://drive.google.com/file/d/1RGKlqb_XNsEOZUgiaEDSBmN86ArVhuZm/view?usp=drive_link",
      "_blank",
      "noopener,noreferrer",
    )
  })

  it("should open Kobudo Manual URL in new tab when clicked", async () => {
    const user = userEvent.setup()

    render(<CurriculumModal isOpen={true} onClose={mockOnClose} />)

    const button = screen.getByRole("button", { name: /kobudo manual/i })
    await user.click(button)

    expect(windowOpenSpy).toHaveBeenCalledWith(
      "https://drive.google.com/file/d/1RHvON4aG8KZ1R5xl7lKjkk0NzyREzHax/view?usp=drive_link",
      "_blank",
      "noopener,noreferrer",
    )
  })

  it("should call onClose when dialog is closed", async () => {
    const user = userEvent.setup()

    render(<CurriculumModal isOpen={true} onClose={mockOnClose} />)

    const closeButton = screen.getByRole("button", { name: /close/i })
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it("should display both buttons with proper icons", () => {
    const { container } = render(<CurriculumModal isOpen={true} onClose={mockOnClose} />)

    const buttons = screen.getAllByRole("button")
    const contentButtons = buttons.filter(
      (b) => b.textContent?.includes("Belt Requirements") || b.textContent?.includes("Kobudo Manual"),
    )

    expect(contentButtons).toHaveLength(2)
    contentButtons.forEach((button) => {
      expect(button.querySelector("svg")).toBeInTheDocument()
    })
  })
})
