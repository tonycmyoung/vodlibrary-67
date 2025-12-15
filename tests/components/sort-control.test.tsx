import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import SortControl from "@/components/sort-control"

describe("SortControl", () => {
  const defaultProps = {
    sortBy: "curriculum",
    sortOrder: "asc" as const,
    onSortChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render sort control with current selection", () => {
    render(<SortControl {...defaultProps} />)

    expect(screen.getByText("Sort by:")).toBeInTheDocument()
    expect(screen.getByRole("combobox")).toBeInTheDocument()
  })

  it("should show correct sort option label", () => {
    render(<SortControl {...defaultProps} sortBy="curriculum" />)

    const trigger = screen.getByRole("combobox")
    expect(trigger).toHaveTextContent("Curriculum")
  })

  it("should render sort order button", () => {
    render(<SortControl {...defaultProps} />)

    const sortOrderButton = screen.getByTitle("Sort descending")
    expect(sortOrderButton).toBeInTheDocument()
  })

  it("should call onSortChange when sort order button is clicked", () => {
    const onSortChange = vi.fn()
    render(<SortControl {...defaultProps} sortOrder="asc" onSortChange={onSortChange} />)

    const sortOrderButton = screen.getByTitle("Sort descending")
    fireEvent.click(sortOrderButton)

    expect(onSortChange).toHaveBeenCalledWith("curriculum", "desc")
  })

  it("should toggle sort order from desc to asc", () => {
    const onSortChange = vi.fn()
    render(<SortControl {...defaultProps} sortOrder="desc" onSortChange={onSortChange} />)

    const sortOrderButton = screen.getByTitle("Sort ascending")
    fireEvent.click(sortOrderButton)

    expect(onSortChange).toHaveBeenCalledWith("curriculum", "asc")
  })

  it("should apply rotate transform when sort order is desc", () => {
    render(<SortControl {...defaultProps} sortOrder="desc" />)

    const icon = screen.getByTitle("Sort ascending").querySelector("svg")
    expect(icon).toHaveClass("rotate-180")
  })

  it("should not apply rotate transform when sort order is asc", () => {
    render(<SortControl {...defaultProps} sortOrder="asc" />)

    const icon = screen.getByTitle("Sort descending").querySelector("svg")
    expect(icon).not.toHaveClass("rotate-180")
  })

  it("should render all sort options in dropdown", () => {
    render(<SortControl {...defaultProps} />)

    const trigger = screen.getByRole("combobox")
    fireEvent.click(trigger)

    const curriculumElements = screen.getAllByText("Curriculum")
    expect(curriculumElements.length).toBeGreaterThan(0)

    expect(screen.getByText("Category")).toBeInTheDocument()
    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(screen.getByText("Added Date")).toBeInTheDocument()
    expect(screen.getByText("Recorded")).toBeInTheDocument()
    expect(screen.getByText("Views")).toBeInTheDocument()
    expect(screen.getByText("Last View")).toBeInTheDocument()
  })
})
