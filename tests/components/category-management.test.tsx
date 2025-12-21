import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import CategoryManagement from "@/components/category-management"
import { createClient } from "@/lib/supabase/client"

vi.mock("@/lib/supabase/client")
vi.mock("@/lib/utils/date", () => ({
  formatShortDate: (date: string) => new Date(date).toLocaleDateString(),
}))

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()

const mockCategories = [
  {
    id: "cat-1",
    name: "Basics",
    description: "Basic techniques",
    color: "#DC2626",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "cat-2",
    name: "Advanced",
    description: null,
    color: "#2563EB",
    created_at: "2024-01-02T00:00:00Z",
  },
]

describe("CategoryManagement", () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()

    mockEq.mockReturnValue({ count: 5 })
    mockOrder.mockResolvedValue({ data: mockCategories, error: null })
    mockSelect.mockReturnValue({ order: mockOrder })
    mockInsert.mockResolvedValue({ data: null, error: null })
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockDelete.mockReturnValue({ eq: mockEq })
    mockEq.mockResolvedValue({ data: null, error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") {
        return {
          select: mockSelect,
          insert: mockInsert,
          update: mockUpdate,
          delete: mockDelete,
        }
      }
      if (table === "video_categories") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 5 }),
          }),
        }
      }
      return { select: mockSelect }
    })

    vi.mocked(createClient).mockReturnValue({
      from: mockFrom,
    } as any)
  })

  it("should render loading state initially", () => {
    render(<CategoryManagement />)
    expect(screen.getByText("Loading categories...")).toBeTruthy()
  })

  it("should render categories after loading", async () => {
    render(<CategoryManagement />)

    await waitFor(() => {
      expect(screen.getByText("Basics")).toBeTruthy()
      expect(screen.getByText("Advanced")).toBeTruthy()
    })
  })

  it("should display category count", async () => {
    render(<CategoryManagement />)

    await waitFor(() => {
      expect(screen.getByText("Basics")).toBeTruthy()
      expect(screen.getByText("Advanced")).toBeTruthy()
    })

    await waitFor(() => {
      const title = screen.getByText(/Categories/)
      expect(title.textContent).toContain("(2)")
    })
  })

  it("should display category descriptions", async () => {
    render(<CategoryManagement />)

    await waitFor(() => {
      expect(screen.getByText("Basic techniques")).toBeTruthy()
    })
  })

  it("should display video count for each category", async () => {
    render(<CategoryManagement />)

    await waitFor(() => {
      const videoCountElements = screen.getAllByText(/5 videos/)
      expect(videoCountElements.length).toBeGreaterThan(0)
    })
  })

  it("should open add dialog when Add Category button is clicked", async () => {
    render(<CategoryManagement />)

    await waitFor(() => {
      expect(screen.getByText("Basics")).toBeTruthy()
    })

    const addButton = screen.getByRole("button", { name: /add category/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add New Category")).toBeTruthy()
    })
  })

  it("should handle form input changes", async () => {
    render(<CategoryManagement />)

    await waitFor(() => {
      expect(screen.getByText("Basics")).toBeTruthy()
    })

    const addButton = screen.getByRole("button", { name: /add category/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeTruthy()
    })

    const nameInput = screen.getByLabelText(/name/i)
    const descriptionInput = screen.getByLabelText(/description/i)

    await user.type(nameInput, "New Category")
    await user.type(descriptionInput, "New description")

    expect(nameInput).toHaveValue("New Category")
    expect(descriptionInput).toHaveValue("New description")
  })

  it("should create new category on form submission", async () => {
    render(<CategoryManagement />)

    await waitFor(() => {
      expect(screen.getByText("Basics")).toBeTruthy()
    })

    const addButton = screen.getByRole("button", { name: /add category/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeTruthy()
    })

    await user.type(screen.getByLabelText(/name/i), "Test Category")
    await user.click(screen.getByRole("button", { name: /add category$/i }))

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith({
        name: "Test Category",
        description: null,
        color: "#DC2626",
      })
    })
  })

  it("should open edit dialog when edit button is clicked", async () => {
    render(<CategoryManagement />)

    await waitFor(() => {
      expect(screen.getByText("Basics")).toBeTruthy()
    })

    const editButtons = screen.getAllByRole("button", { name: "" })
    const editButton = editButtons.find((btn) => btn.querySelector("svg.lucide-pencil"))
    await user.click(editButton!)

    await waitFor(() => {
      expect(screen.getByText("Edit Category")).toBeTruthy()
      expect(screen.getByLabelText(/name/i)).toHaveValue("Basics")
    })
  })

  it("should update category on edit form submission", async () => {
    render(<CategoryManagement />)

    await waitFor(() => {
      expect(screen.getByText("Basics")).toBeTruthy()
    })

    const editButtons = screen.getAllByRole("button", { name: "" })
    const editButton = editButtons.find((btn) => btn.querySelector("svg.lucide-pencil"))
    await user.click(editButton!)

    await waitFor(() => {
      expect(screen.getByText("Edit Category")).toBeTruthy()
    })

    const nameInput = screen.getByLabelText(/name/i)
    await user.clear(nameInput)
    await user.type(nameInput, "Updated Basics")

    await user.click(screen.getByRole("button", { name: /update category/i }))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled()
    })
  })

  it("should handle category deletion with confirmation", async () => {
    window.confirm = vi.fn(() => true)

    render(<CategoryManagement />)

    await waitFor(() => {
      expect(screen.getByText("Basics")).toBeTruthy()
    })

    const allButtons = screen.getAllByRole("button")
    const basicsText = screen.getByText("Basics")
    const basicsCard = basicsText.closest(".space-y-6, .grid > *") // Find the parent card element

    // Get all buttons within this card and find the delete button (red border button)
    const buttonsInCard = basicsCard ? Array.from(basicsCard.querySelectorAll("button")) : []
    const deleteButton = buttonsInCard.find((btn) => btn.className.includes("border-red-600"))

    expect(deleteButton).toBeTruthy()
    await user.click(deleteButton as HTMLElement)

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled()
      expect(mockDelete).toHaveBeenCalled()
    })
  })

  it("should not delete category if user cancels confirmation", async () => {
    window.confirm = vi.fn(() => false)

    render(<CategoryManagement />)

    await waitFor(() => {
      expect(screen.getByText("Basics")).toBeTruthy()
    })

    const allButtons = screen.getAllByRole("button")
    const basicsText = screen.getByText("Basics")
    const basicsCard = basicsText.closest(".space-y-6, .grid > *") // Find the parent card element

    // Get all buttons within this card and find the delete button (red border button)
    const buttonsInCard = basicsCard ? Array.from(basicsCard.querySelectorAll("button")) : []
    const deleteButton = buttonsInCard.find((btn) => btn.className.includes("border-red-600"))

    expect(deleteButton).toBeTruthy()
    await user.click(deleteButton as HTMLElement)

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled()
    })

    expect(mockDelete).not.toHaveBeenCalled()
  })

  it("should allow color selection in form", async () => {
    render(<CategoryManagement />)

    await waitFor(() => {
      expect(screen.getByText("Basics")).toBeTruthy()
    })

    const addButton = screen.getByRole("button", { name: /add category/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeTruthy()
    })

    const colorButtons = screen.getAllByRole("button").filter((btn) => btn.style.backgroundColor)
    expect(colorButtons.length).toBeGreaterThan(0)
  })

  it("should close dialog on cancel", async () => {
    render(<CategoryManagement />)

    await waitFor(() => {
      expect(screen.getByText("Basics")).toBeTruthy()
    })

    const addButton = screen.getByRole("button", { name: /add category/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add New Category")).toBeTruthy()
    })

    await user.click(screen.getByRole("button", { name: /cancel/i }))

    await waitFor(() => {
      expect(screen.queryByText("Add New Category")).toBeNull()
    })
  })

  it("should show empty state when no categories exist", async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })

    render(<CategoryManagement />)

    await waitFor(() => {
      expect(screen.getByText(/No categories found/i)).toBeTruthy()
    })
  })
})
