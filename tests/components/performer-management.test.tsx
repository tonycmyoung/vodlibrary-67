import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PerformerManagement from "@/components/performer-management"
import { createBrowserClient } from "@/lib/supabase/client"
import { addPerformer, updatePerformer, deletePerformer } from "@/lib/actions"

vi.mock("@/lib/supabase/client")
vi.mock("@/lib/actions", () => ({
  addPerformer: vi.fn(),
  updatePerformer: vi.fn(),
  deletePerformer: vi.fn(),
}))

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockOrder = vi.fn()

const mockPerformers = [
  {
    id: "perf-1",
    name: "John Doe",
    created_at: "2024-01-01T00:00:00Z",
    video_performers: [{ count: 5 }],
  },
  {
    id: "perf-2",
    name: "Jane Smith",
    created_at: "2024-01-02T00:00:00Z",
    video_performers: [{ count: 3 }],
  },
]

describe("PerformerManagement", () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()

    mockOrder.mockResolvedValue({ data: mockPerformers, error: null })
    mockSelect.mockReturnValue({ order: mockOrder })

    mockFrom.mockImplementation((table: string) => {
      if (table === "performers") {
        return {
          select: mockSelect,
        }
      }
      return { select: mockSelect }
    })

    vi.mocked(createBrowserClient).mockReturnValue({
      from: mockFrom,
    } as any)

    vi.mocked(addPerformer).mockResolvedValue({ error: null } as any)
    vi.mocked(updatePerformer).mockResolvedValue({ error: null } as any)
    vi.mocked(deletePerformer).mockResolvedValue({ error: null } as any)
  })

  it("should render loading state initially", () => {
    render(<PerformerManagement />)
    expect(screen.getByText("Loading performers...")).toBeInTheDocument()
  })

  it("should render performers after loading", async () => {
    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
      expect(screen.getByText("Jane Smith")).toBeInTheDocument()
    })
  })

  it("should display performer count in header", async () => {
    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    await waitFor(() => {
      const title = screen.getByText(/Performers/)
      expect(title.textContent).toContain("(2)")
    })
  })

  it("should display video counts for each performer", async () => {
    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("5 videos")).toBeInTheDocument()
      expect(screen.getByText("3 videos")).toBeInTheDocument()
    })
  })

  it("should add new performer when Add button is clicked", async () => {
    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText("Performer name")
    await user.type(input, "New Performer")

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(addPerformer).toHaveBeenCalledWith("New Performer")
    })
  })

  it("should not add performer with empty name", async () => {
    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    expect(addPerformer).not.toHaveBeenCalled()
  })

  it("should enter edit mode when edit button is clicked", async () => {
    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const allButtons = screen.getAllByRole("button")
    const johnDoeText = screen.getByText("John Doe")
    const performerCard = johnDoeText.closest("div.p-3")

    const buttonsInCard = performerCard ? Array.from(performerCard.querySelectorAll("button")) : []
    const editButton = buttonsInCard.find((btn) => btn.querySelector("svg.lucide-pencil"))

    expect(editButton).toBeTruthy()
    await user.click(editButton as HTMLElement)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument()
    })
  })

  it("should update performer when Save button is clicked", async () => {
    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const johnDoeText = screen.getByText("John Doe")
    const performerCard = johnDoeText.closest("div.p-3")
    const buttonsInCard = performerCard ? Array.from(performerCard.querySelectorAll("button")) : []
    const editButton = buttonsInCard.find((btn) => btn.querySelector("svg.lucide-pencil"))

    await user.click(editButton as HTMLElement)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const input = screen.getByDisplayValue("John Doe")
    await user.clear(input)
    await user.type(input, "Updated Name")

    const saveButton = screen.getByRole("button", { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(updatePerformer).toHaveBeenCalledWith("perf-1", "Updated Name")
    })
  })

  it("should cancel edit mode when Cancel button is clicked", async () => {
    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const johnDoeText = screen.getByText("John Doe")
    const performerCard = johnDoeText.closest("div.p-3")
    const buttonsInCard = performerCard ? Array.from(performerCard.querySelectorAll("button")) : []
    const editButton = buttonsInCard.find((btn) => btn.querySelector("svg.lucide-pencil"))

    await user.click(editButton as HTMLElement)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument()
    })

    const cancelButton = screen.getByRole("button", { name: /cancel/i })
    await user.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument()
    })
  })

  it("should delete performer with confirmation", async () => {
    window.confirm = vi.fn(() => true)

    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const johnDoeText = screen.getByText("John Doe")
    const performerCard = johnDoeText.closest("div.p-3")
    const buttonsInCard = performerCard ? Array.from(performerCard.querySelectorAll("button")) : []
    const deleteButton = buttonsInCard.find((btn) => btn.className.includes("border-red-600"))

    expect(deleteButton).toBeTruthy()
    await user.click(deleteButton as HTMLElement)

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled()
      expect(deletePerformer).toHaveBeenCalledWith("perf-1")
    })
  })

  it("should not delete performer if user cancels confirmation", async () => {
    window.confirm = vi.fn(() => false)

    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const johnDoeText = screen.getByText("John Doe")
    const performerCard = johnDoeText.closest("div.p-3")
    const buttonsInCard = performerCard ? Array.from(performerCard.querySelectorAll("button")) : []
    const deleteButton = buttonsInCard.find((btn) => btn.className.includes("border-red-600"))

    await user.click(deleteButton as HTMLElement)

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled()
    })

    expect(deletePerformer).not.toHaveBeenCalled()
  })

  it("should show empty state when no performers exist", async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })

    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText(/No performers found/i)).toBeInTheDocument()
    })
  })

  it("should display success message after adding performer", async () => {
    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText("Performer name")
    await user.type(input, "Test Performer")

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Performer added successfully")).toBeInTheDocument()
    })
  })

  it("should display error message when add fails", async () => {
    vi.mocked(addPerformer).mockResolvedValue({ error: "Database error" } as any)

    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText("Performer name")
    await user.type(input, "Test Performer")

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText(/Error adding performer/i)).toBeInTheDocument()
    })
  })

  it("should handle fetch error gracefully", async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: "Fetch failed" } })

    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("Failed to load performers")).toBeInTheDocument()
    })
  })
})
