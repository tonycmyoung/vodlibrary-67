import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import MobileFilterDialog from "@/components/mobile-filter-dialog"

// Mock Dialog components from shadcn/ui
// Dialog always renders trigger, but content is conditional on `open`
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) => (
    <div data-testid="dialog" data-open={open}>
      {children}
    </div>
  ),
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogTrigger: ({ children }: any) => <div data-testid="dialog-trigger">{children}</div>,
}))

// Mock Button component
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
    <button onClick={onClick} disabled={disabled} className={className} data-testid="button">
      {children}
    </button>
  ),
}))

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Filter: () => <span data-testid="filter-icon">Filter</span>,
  ChevronDown: () => <span data-testid="chevron-down">ChevronDown</span>,
  ChevronUp: () => <span data-testid="chevron-up">ChevronUp</span>,
}))

// Mock CategoryFilter component
vi.mock("@/components/category-filter", () => ({
  default: ({ categories, curriculums, onCategoryToggle, onCurriculumToggle }: any) => (
    <div data-testid="category-filter">
      <div data-testid="categories-section">
        {categories?.map((cat: any) => (
          <button key={cat.id} onClick={() => onCategoryToggle(cat.id)} data-testid={`category-${cat.id}`}>
            {cat.name}
          </button>
        ))}
      </div>
      <div data-testid="curriculums-section">
        {curriculums?.map((curr: any) => (
          <button key={curr.id} onClick={() => onCurriculumToggle(curr.id)} data-testid={`curriculum-${curr.id}`}>
            {curr.name}
          </button>
        ))}
      </div>
    </div>
  ),
}))

describe("MobileFilterDialog", () => {
  const mockCategories = [
    { id: "cat-1", name: "Bo", color: "#ff0000", description: "Staff weapon" },
    { id: "cat-2", name: "Sai", color: "#00ff00", description: "Trident weapon" },
  ]

  const mockCurriculums = [
    { id: "curr-1", name: "10.Kyu", color: "#ffffff", display_order: 1, description: "White belt" },
    { id: "curr-2", name: "9.Kyu", color: "#ffff00", display_order: 2, description: "Yellow belt" },
  ]

  const mockPerformers = [
    { id: "perf-1", name: "John Doe" },
    { id: "perf-2", name: "Jane Smith" },
  ]

  const defaultProps = {
    showMobileFilters: true,
    setShowMobileFilters: vi.fn(),
    categories: mockCategories,
    recordedValues: ["2023", "2024"],
    performers: mockPerformers,
    selectedCategories: [],
    onCategoryToggle: vi.fn(),
    videoCount: 10,
    curriculums: mockCurriculums,
    selectedCurriculums: [],
    onCurriculumToggle: vi.fn(),
    filterMode: "OR" as const,
    onFilterModeChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("should render the filter button trigger", () => {
      render(<MobileFilterDialog {...defaultProps} showMobileFilters={false} />)

      expect(screen.getByTestId("dialog-trigger")).toBeTruthy()
      expect(screen.getByTestId("filter-icon")).toBeTruthy()
    })

    it("should show dialog content when open", () => {
      render(<MobileFilterDialog {...defaultProps} />)

      expect(screen.getByTestId("dialog")).toBeTruthy()
      expect(screen.getByTestId("dialog-content")).toBeTruthy()
      expect(screen.getByTestId("dialog-title")).toHaveTextContent("Filter Videos")
    })

    it("should not show dialog content when closed", () => {
      render(<MobileFilterDialog {...defaultProps} showMobileFilters={false} />)

      expect(screen.queryByTestId("dialog")).toBeNull()
    })

    it("should display filter count in button when filters are selected", () => {
      render(
        <MobileFilterDialog
          {...defaultProps}
          showMobileFilters={false}
          selectedCategories={["cat-1"]}
          selectedCurriculums={["curr-1"]}
        />,
      )

      // The component shows filter count as a span inside the button
      const button = screen.getByTestId("button")
      expect(button).toHaveTextContent("2")
    })

    it("should not display filter count when no filters are selected", () => {
      render(<MobileFilterDialog {...defaultProps} showMobileFilters={false} />)

      // Button should just show "Filters" without a count
      const button = screen.getByTestId("button")
      expect(button).toHaveTextContent("Filters")
      expect(button.textContent).not.toMatch(/\d/)
    })
  })

  describe("Filter Mode Toggle", () => {
    it("should show filter mode toggle when multiple filters are selected", () => {
      render(
        <MobileFilterDialog
          {...defaultProps}
          selectedCategories={["cat-1"]}
          selectedCurriculums={["curr-1"]}
        />,
      )

      // Filter mode toggle appears when 2+ filters selected
      expect(screen.getByText(/Filter mode/i)).toBeTruthy()
    })

    it("should call onFilterModeChange when toggling filter mode", () => {
      render(
        <MobileFilterDialog
          {...defaultProps}
          selectedCategories={["cat-1"]}
          selectedCurriculums={["curr-1"]}
        />,
      )

      const andButton = screen.getByText("AND")
      fireEvent.click(andButton)

      expect(defaultProps.onFilterModeChange).toHaveBeenCalledWith("AND")
    })
  })

  describe("Apply Filters", () => {
    it("should call setShowMobileFilters when Apply Filters button is clicked", () => {
      render(<MobileFilterDialog {...defaultProps} />)

      const applyButton = screen.getByText("Apply Filters")
      fireEvent.click(applyButton)

      expect(defaultProps.setShowMobileFilters).toHaveBeenCalledWith(false)
    })
  })

  describe("Category Selection", () => {
    it("should render CategoryFilter component with categories", () => {
      render(<MobileFilterDialog {...defaultProps} />)

      expect(screen.getByTestId("category-filter")).toBeTruthy()
      expect(screen.getByText("Bo")).toBeTruthy()
      expect(screen.getByText("Sai")).toBeTruthy()
    })

    it("should call onCategoryToggle when category is clicked", () => {
      render(<MobileFilterDialog {...defaultProps} />)

      const categoryButton = screen.getByTestId("category-cat-1")
      fireEvent.click(categoryButton)

      expect(defaultProps.onCategoryToggle).toHaveBeenCalledWith("cat-1")
    })
  })

  describe("Curriculum Selection", () => {
    it("should render CategoryFilter component with curriculums", () => {
      render(<MobileFilterDialog {...defaultProps} />)

      expect(screen.getByTestId("curriculums-section")).toBeTruthy()
      expect(screen.getByText("10.Kyu")).toBeTruthy()
      expect(screen.getByText("9.Kyu")).toBeTruthy()
    })

    it("should call onCurriculumToggle when curriculum is clicked", () => {
      render(<MobileFilterDialog {...defaultProps} />)

      const curriculumButton = screen.getByTestId("curriculum-curr-1")
      fireEvent.click(curriculumButton)

      expect(defaultProps.onCurriculumToggle).toHaveBeenCalledWith("curr-1")
    })
  })
})
