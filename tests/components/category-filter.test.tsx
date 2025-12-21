import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import CategoryFilter from "@/components/category-filter"

describe("CategoryFilter", () => {
  const mockCategories = [
    { id: "cat-1", name: "Bo", color: "#ff0000", description: "Staff weapon" },
    { id: "cat-2", name: "Sai", color: "#00ff00" },
    { id: "cat-3", name: "Nunchaku", color: "#0000ff" },
  ]

  const mockPerformers = [
    { id: "perf-1", name: "John Doe" },
    { id: "perf-2", name: "Jane Smith" },
  ]

  const mockRecordedValues = ["2023", "2024", "DVD"]

  const mockCurriculums = [
    { id: "curr-1", name: "10.Kyu", color: "#ffffff", display_order: 1 },
    { id: "curr-2", name: "9.Kyu", color: "#ffff00", display_order: 2 },
  ]

  const defaultProps = {
    categories: mockCategories,
    recordedValues: mockRecordedValues,
    performers: mockPerformers,
    selectedCategories: [],
    onCategoryToggle: vi.fn(),
    videoCount: 10,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render all category sections", () => {
    render(<CategoryFilter {...defaultProps} />)

    expect(screen.getByText("Filter by")).toBeTruthy()
    expect(screen.getByText("CATEGORY")).toBeTruthy()
    expect(screen.getByText("PERFORMERS")).toBeTruthy()
    expect(screen.getByText("RECORDED")).toBeTruthy()
  })

  it("should render all categories", () => {
    render(<CategoryFilter {...defaultProps} />)

    expect(screen.getByText("Bo")).toBeTruthy()
    expect(screen.getByText("Sai")).toBeTruthy()
    expect(screen.getByText("Nunchaku")).toBeTruthy()
  })

  it("should render all performers", () => {
    render(<CategoryFilter {...defaultProps} />)

    expect(screen.getByText("John Doe")).toBeTruthy()
    expect(screen.getByText("Jane Smith")).toBeTruthy()
  })

  it("should render recorded years in chronological order", () => {
    render(<CategoryFilter {...defaultProps} />)

    const recordedBadges = screen.getAllByText(/^\d{4}$|^DVD$/)
    expect(recordedBadges).toHaveLength(3)
    // Years should come before non-years
    expect(recordedBadges[0]).toHaveTextContent("2023")
    expect(recordedBadges[1]).toHaveTextContent("2024")
    expect(recordedBadges[2]).toHaveTextContent("DVD")
  })

  it("should call onCategoryToggle when category is clicked", () => {
    const onCategoryToggle = vi.fn()
    render(<CategoryFilter {...defaultProps} onCategoryToggle={onCategoryToggle} />)

    const categoryBadge = screen.getByText("Bo")
    fireEvent.click(categoryBadge)

    expect(onCategoryToggle).toHaveBeenCalledWith("cat-1")
  })

  it("should call onCategoryToggle when performer is clicked", () => {
    const onCategoryToggle = vi.fn()
    render(<CategoryFilter {...defaultProps} onCategoryToggle={onCategoryToggle} />)

    const performerBadge = screen.getByText("John Doe")
    fireEvent.click(performerBadge)

    expect(onCategoryToggle).toHaveBeenCalledWith("performer:perf-1")
  })

  it("should call onCategoryToggle when recorded value is clicked", () => {
    const onCategoryToggle = vi.fn()
    render(<CategoryFilter {...defaultProps} onCategoryToggle={onCategoryToggle} />)

    const recordedBadge = screen.getByText("2023")
    fireEvent.click(recordedBadge)

    expect(onCategoryToggle).toHaveBeenCalledWith("recorded:2023")
  })

  it("should show selected categories with different styling", () => {
    render(<CategoryFilter {...defaultProps} selectedCategories={["cat-1"]} />)

    const selectedBadge = screen.getByText("Bo")
    expect(selectedBadge).toHaveClass("shadow-lg")
  })

  it("should display correct video count", () => {
    render(<CategoryFilter {...defaultProps} videoCount={5} />)

    expect(screen.getByText(/Showing 5 videos/)).toBeTruthy()
  })

  it("should display filter count when filters are selected", () => {
    render(<CategoryFilter {...defaultProps} selectedCategories={["cat-1", "cat-2"]} videoCount={3} />)

    expect(screen.getByText(/Showing 3 videos matching: 2 filters/)).toBeTruthy()
  })

  it("should show Clear All button when filters are selected", () => {
    render(<CategoryFilter {...defaultProps} selectedCategories={["cat-1"]} />)

    expect(screen.getByText("Clear All")).toBeTruthy()
  })

  it("should not show Clear All button when no filters are selected", () => {
    render(<CategoryFilter {...defaultProps} selectedCategories={[]} />)

    expect(screen.queryByText("Clear All")).toBeNull()
  })

  it("should clear all filters when Clear All is clicked", () => {
    const onCategoryToggle = vi.fn()
    const onCurriculumToggle = vi.fn()

    render(
      <CategoryFilter
        {...defaultProps}
        selectedCategories={["cat-1", "cat-2"]}
        curriculums={mockCurriculums}
        selectedCurriculums={["curr-1"]}
        onCategoryToggle={onCategoryToggle}
        onCurriculumToggle={onCurriculumToggle}
      />,
    )

    const clearButton = screen.getByText("Clear All")
    fireEvent.click(clearButton)

    expect(onCategoryToggle).toHaveBeenCalledTimes(2)
    expect(onCurriculumToggle).toHaveBeenCalledTimes(1)
  })

  it("should render curriculum section when provided", () => {
    render(
      <CategoryFilter
        {...defaultProps}
        curriculums={mockCurriculums}
        selectedCurriculums={[]}
        onCurriculumToggle={vi.fn()}
      />,
    )

    expect(screen.getByText("CURRICULUM")).toBeTruthy()
  })

  it("should filter out 'Unset' from recorded values", () => {
    render(<CategoryFilter {...defaultProps} recordedValues={["2023", "Unset", "DVD"]} />)

    expect(screen.queryByText("Unset")).toBeNull()
    expect(screen.getByText("2023")).toBeTruthy()
    expect(screen.getByText("DVD")).toBeTruthy()
  })
})
