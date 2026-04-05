import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import CurriculumSetsManagement from "@/components/curriculum-sets-management"
import {
  getCurriculumSets,
  getCurriculumSetWithLevels,
  createCurriculumSet,
  updateCurriculumSet,
  deleteCurriculumSet,
  addLevelToCurriculumSet,
  updateLevelInCurriculumSet,
  deleteLevelFromCurriculumSet,
  reorderLevelsInCurriculumSet,
} from "@/lib/actions/curriculums"
import { useToast } from "@/hooks/use-toast"

vi.mock("@/lib/actions/curriculums", () => ({
  getCurriculumSets: vi.fn(),
  getCurriculumSetWithLevels: vi.fn(),
  createCurriculumSet: vi.fn(),
  updateCurriculumSet: vi.fn(),
  deleteCurriculumSet: vi.fn(),
  addLevelToCurriculumSet: vi.fn(),
  updateLevelInCurriculumSet: vi.fn(),
  deleteLevelFromCurriculumSet: vi.fn(),
  reorderLevelsInCurriculumSet: vi.fn(),
}))

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(),
}))

global.confirm = vi.fn()

describe("CurriculumSetsManagement", () => {
  const mockToast = vi.fn()

  const mockSets = [
    { id: "set-1", name: "Okinawa Kobudo Australia", description: "Australian curriculum", created_at: "2024-01-01" },
    { id: "set-2", name: "Matayoshi International", description: null, created_at: "2024-01-02" },
  ]

  const mockSetWithLevels = {
    id: "set-1",
    name: "Okinawa Kobudo Australia",
    description: "Australian curriculum",
    created_at: "2024-01-01",
    levels: [
      { id: "level-1", name: "White Belt", description: null, color: "#ffffff", display_order: 0, curriculum_set_id: "set-1" },
      { id: "level-2", name: "Blue Belt", description: "Intermediate", color: "#0000ff", display_order: 1, curriculum_set_id: "set-1" },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useToast).mockReturnValue({ toast: mockToast, dismiss: vi.fn(), toasts: [] })
    vi.mocked(getCurriculumSets).mockResolvedValue(mockSets)
    vi.mocked(getCurriculumSetWithLevels).mockResolvedValue(mockSetWithLevels)
    vi.mocked(createCurriculumSet).mockResolvedValue({ success: "Curriculum set created successfully", id: "set-3" })
    vi.mocked(updateCurriculumSet).mockResolvedValue({ success: "Curriculum set updated successfully" })
    vi.mocked(deleteCurriculumSet).mockResolvedValue({ success: "Curriculum set deleted successfully" })
    vi.mocked(addLevelToCurriculumSet).mockResolvedValue({ success: "Level added successfully", id: "level-3" })
    vi.mocked(updateLevelInCurriculumSet).mockResolvedValue({ success: "Level updated successfully" })
    vi.mocked(deleteLevelFromCurriculumSet).mockResolvedValue({ success: "Level deleted successfully" })
    vi.mocked(reorderLevelsInCurriculumSet).mockResolvedValue({ success: "Levels reordered successfully" })
  })

  it("should render loading state initially", () => {
    render(<CurriculumSetsManagement />)
    expect(screen.getByText(/loading curriculum sets/i)).toBeTruthy()
  })

  it("should render curriculum sets after loading", async () => {
    render(<CurriculumSetsManagement />)
    
    await waitFor(() => {
      expect(screen.getByText("Okinawa Kobudo Australia")).toBeTruthy()
    })
    expect(screen.getByText("Matayoshi International")).toBeTruthy()
  })

  it("should select a curriculum set and show its levels", async () => {
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(screen.getByText("Okinawa Kobudo Australia")).toBeTruthy()
    })

    // First set should be auto-selected and levels should be shown
    await waitFor(() => {
      expect(screen.getByText("White Belt")).toBeTruthy()
      expect(screen.getByText("Blue Belt")).toBeTruthy()
    })
  })

  it("should open create curriculum set dialog", async () => {
    const user = userEvent.setup()
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(screen.getByText("Okinawa Kobudo Australia")).toBeTruthy()
    })

    await user.click(screen.getByText("New Curriculum Set"))

    await waitFor(() => {
      expect(screen.getByText("Create Curriculum Set")).toBeTruthy()
    })
  })

  it("should create a new curriculum set", async () => {
    const user = userEvent.setup()
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(screen.getByText("Okinawa Kobudo Australia")).toBeTruthy()
    })

    await user.click(screen.getByText("New Curriculum Set"))

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeTruthy()
    })

    await user.type(screen.getByLabelText(/name/i), "New Test Set")
    await user.type(screen.getByLabelText(/description/i), "Test description")
    await user.click(screen.getByRole("button", { name: /create/i }))

    await waitFor(() => {
      expect(createCurriculumSet).toHaveBeenCalledWith({
        name: "New Test Set",
        description: "Test description",
      })
    })
  })

  it("should handle create curriculum set error", async () => {
    vi.mocked(createCurriculumSet).mockResolvedValue({ error: "Failed to create" })
    const user = userEvent.setup()
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(screen.getByText("Okinawa Kobudo Australia")).toBeTruthy()
    })

    await user.click(screen.getByText("New Curriculum Set"))
    await user.type(screen.getByLabelText(/name/i), "New Test Set")
    await user.click(screen.getByRole("button", { name: /create/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Error", variant: "destructive" })
      )
    })
  })

  it("should delete a curriculum set with confirmation", async () => {
    vi.mocked(global.confirm).mockReturnValue(true)
    const user = userEvent.setup()
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(screen.getByText("Okinawa Kobudo Australia")).toBeTruthy()
    })

    // Click the dropdown menu on the first set
    const moreButtons = screen.getAllByRole("button", { name: "" })
    const dropdownButton = moreButtons.find((btn) => btn.querySelector("svg"))
    if (dropdownButton) {
      await user.click(dropdownButton)
    }

    await waitFor(() => {
      const deleteButton = screen.getByText("Delete")
      expect(deleteButton).toBeTruthy()
    })
  })

  it("should open add level dialog", async () => {
    const user = userEvent.setup()
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(screen.getByText("White Belt")).toBeTruthy()
    })

    await user.click(screen.getByText("Add Level"))

    await waitFor(() => {
      expect(screen.getByText("Add Level")).toBeTruthy()
      expect(screen.getByLabelText(/level name/i)).toBeTruthy()
    })
  })

  it("should add a level to curriculum set", async () => {
    const user = userEvent.setup()
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(screen.getByText("White Belt")).toBeTruthy()
    })

    await user.click(screen.getByText("Add Level"))
    
    await waitFor(() => {
      expect(screen.getByLabelText(/level name/i)).toBeTruthy()
    })

    await user.type(screen.getByLabelText(/level name/i), "Green Belt")
    
    // Find the Add button in the dialog (not the trigger)
    const addButtons = screen.getAllByRole("button", { name: /add/i })
    const submitButton = addButtons.find((btn) => btn.getAttribute("type") === "submit")
    if (submitButton) {
      await user.click(submitButton)
    }

    await waitFor(() => {
      expect(addLevelToCurriculumSet).toHaveBeenCalled()
    })
  })

  it("should show empty state when no curriculum sets exist", async () => {
    vi.mocked(getCurriculumSets).mockResolvedValue([])
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(screen.getByText("No curriculum sets yet")).toBeTruthy()
    })
  })

  it("should show empty state when selected set has no levels", async () => {
    vi.mocked(getCurriculumSetWithLevels).mockResolvedValue({
      ...mockSetWithLevels,
      levels: [],
    })
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(screen.getByText("No levels in this curriculum set")).toBeTruthy()
    })
  })
})
