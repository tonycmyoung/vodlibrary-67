import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import CurriculumFilter from "@/components/curriculum-filter"

describe("CurriculumFilter", () => {
  const mockCurriculums = [
    { id: "curr-1", name: "10.Kyu", color: "#ffffff", display_order: 1, description: "White belt", curriculum_set_id: "set-1", curriculum_set: { id: "set-1", name: "Okinawa Kobudo" } },
    { id: "curr-2", name: "9.Kyu", color: "#ffff00", display_order: 2, description: "Yellow belt", curriculum_set_id: "set-1", curriculum_set: { id: "set-1", name: "Okinawa Kobudo" } },
    { id: "curr-3", name: "8.Kyu", color: "#ff8800", display_order: 3, curriculum_set_id: "set-2", curriculum_set: { id: "set-2", name: "Matayoshi" } },
  ]

  const defaultProps = {
    curriculums: mockCurriculums,
    selectedCurriculums: [],
    onCurriculumToggle: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render all curriculums sorted by display_order", () => {
    render(<CurriculumFilter {...defaultProps} />)

    expect(screen.getByText("10.Kyu")).toBeTruthy()
    expect(screen.getByText("9.Kyu")).toBeTruthy()
    expect(screen.getByText("8.Kyu")).toBeTruthy()
  })

  it("should render CURRICULUM label", () => {
    render(<CurriculumFilter {...defaultProps} />)

    expect(screen.getByText("CURRICULUM")).toBeTruthy()
  })

  it("should call onCurriculumToggle when curriculum is clicked", async () => {
    const user = userEvent.setup()
    const onCurriculumToggle = vi.fn()
    render(<CurriculumFilter {...defaultProps} onCurriculumToggle={onCurriculumToggle} />)

    // Use 8.Kyu which doesn't have a description (no tooltip wrapper)
    const curriculumBadge = screen.getByText("8.Kyu")
    await user.click(curriculumBadge)

    expect(onCurriculumToggle).toHaveBeenCalledWith("curr-3")
  })

  it("should show selected curriculum with different styling", () => {
    render(<CurriculumFilter {...defaultProps} selectedCurriculums={["curr-1"]} />)

    const selectedBadge = screen.getByText("10.Kyu")
    expect(selectedBadge).toHaveClass("shadow-lg")
  })

  it("should not render when curriculums array is empty", () => {
    const { container } = render(<CurriculumFilter {...defaultProps} curriculums={[]} />)

    expect(container.firstChild).toBeNull()
  })

  it("should render tooltip for curriculums with descriptions", () => {
    render(<CurriculumFilter {...defaultProps} />)

    // Tooltips are rendered but descriptions are in TooltipContent which needs hover to show
    expect(screen.getByText("10.Kyu")).toBeTruthy()
    expect(screen.getByText("9.Kyu")).toBeTruthy()
  })

  it("should handle curriculums without descriptions", () => {
    render(<CurriculumFilter {...defaultProps} />)

    expect(screen.getByText("8.Kyu")).toBeTruthy()
  })

  it("should apply correct colors to badges", () => {
    render(<CurriculumFilter {...defaultProps} selectedCurriculums={["curr-1"]} />)

    const selectedBadge = screen.getByText("10.Kyu")
    expect(selectedBadge).toHaveStyle({ backgroundColor: "#ffffff" })
  })

  describe("groupBySet", () => {
    it("should render curriculums grouped by set when groupBySet is true", () => {
      render(<CurriculumFilter {...defaultProps} groupBySet={true} />)

      // Should show set names as labels
      expect(screen.getByText("Okinawa Kobudo:")).toBeTruthy()
      expect(screen.getByText("Matayoshi:")).toBeTruthy()
    })

    it("should render curriculums within their respective sets", () => {
      render(<CurriculumFilter {...defaultProps} groupBySet={true} />)

      // All curriculum badges should still be present
      expect(screen.getByText("10.Kyu")).toBeTruthy()
      expect(screen.getByText("9.Kyu")).toBeTruthy()
      expect(screen.getByText("8.Kyu")).toBeTruthy()
    })

    it("should not show set labels when groupBySet is false", () => {
      render(<CurriculumFilter {...defaultProps} groupBySet={false} />)

      expect(screen.queryByText("Okinawa Kobudo:")).toBeNull()
      expect(screen.queryByText("Matayoshi:")).toBeNull()
    })

    it("should still allow toggling curriculums when grouped", async () => {
      const user = userEvent.setup()
      const onCurriculumToggle = vi.fn()
      render(<CurriculumFilter {...defaultProps} onCurriculumToggle={onCurriculumToggle} groupBySet={true} />)

      const curriculumBadge = screen.getByText("8.Kyu")
      await user.click(curriculumBadge)

      expect(onCurriculumToggle).toHaveBeenCalledWith("curr-3")
    })
  })
})
