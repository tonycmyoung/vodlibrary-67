import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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
    render(<SortControl {...defaultProps} sortBy="curriculum" />)

    expect(screen.getByText("Sort by:")).toBeTruthy()
    const combobox = screen.getByRole("combobox")
    expect(combobox).toBeTruthy()
    expect(combobox).toHaveTextContent("Curriculum")
  })

  it("should show correct sort option label", () => {
    render(<SortControl {...defaultProps} sortBy="curriculum" />)

    const trigger = screen.getByRole("combobox")
    expect(trigger).toHaveTextContent("Curriculum")
  })

  it("should render sort order button", () => {
    render(<SortControl {...defaultProps} sortOrder="asc" />)

    const sortOrderButton = screen.getByTitle("Sort descending")
    expect(sortOrderButton).toBeTruthy()

    const icon = sortOrderButton.querySelector("svg")
    expect(icon).not.toHaveClass("rotate-180")
  })

  it("should call onSortChange when sort order button is clicked", async () => {
    const user = userEvent.setup()
    const onSortChange = vi.fn()
    render(<SortControl {...defaultProps} sortOrder="asc" onSortChange={onSortChange} />)

    const sortOrderButton = screen.getByTitle("Sort descending")
    await user.click(sortOrderButton)

    expect(onSortChange).toHaveBeenCalledWith("curriculum", "desc")
  })

  it("should toggle sort order from desc to asc", async () => {
    const user = userEvent.setup()
    const onSortChange = vi.fn()
    render(<SortControl {...defaultProps} sortOrder="desc" onSortChange={onSortChange} />)

    const sortOrderButton = screen.getByTitle("Sort ascending")
    await user.click(sortOrderButton)

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

  it("should render sort control with selectable options", async () => {
    const _user = userEvent.setup()
    const onSortChange = vi.fn()
    render(<SortControl {...defaultProps} sortBy="title" onSortChange={onSortChange} />)

    const trigger = screen.getByRole("combobox")
    expect(trigger).toHaveTextContent("Name")

    // Verify the component renders with different initial values
    const { rerender: _rerender } = render(
      <SortControl {...defaultProps} sortBy="category" onSortChange={onSortChange} />
    )

    const trigger2 = screen.getAllByRole("combobox")[1]
    expect(trigger2).toHaveTextContent("Category")
  })
})
