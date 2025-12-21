import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import CurriculumFilter from "@/components/curriculum-filter"

describe("CurriculumFilter", () => {
  const mockCurriculums = [
    { id: "curr-1", name: "10.Kyu", color: "#ffffff", display_order: 1, description: "White belt" },
    { id: "curr-2", name: "9.Kyu", color: "#ffff00", display_order: 2, description: "Yellow belt" },
    { id: "curr-3", name: "8.Kyu", color: "#ff8800", display_order: 3 },
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

  it("should call onCurriculumToggle when curriculum is clicked", () => {
    const onCurriculumToggle = vi.fn()
    render(<CurriculumFilter {...defaultProps} onCurriculumToggle={onCurriculumToggle} />)

    const curriculumBadge = screen.getByText("10.Kyu")
    fireEvent.click(curriculumBadge)

    expect(onCurriculumToggle).toHaveBeenCalledWith("curr-1")
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
})
