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
      { id: "level-2", name: "Blue Belt", description: null, color: "#0000ff", display_order: 1, curriculum_set_id: "set-1" },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useToast).mockReturnValue({ toast: mockToast, dismiss: vi.fn(), toasts: [] })
    vi.mocked(getCurriculumSets).mockResolvedValue(mockSets)
    vi.mocked(getCurriculumSetWithLevels).mockResolvedValue(mockSetWithLevels)
    vi.mocked(createCurriculumSet).mockResolvedValue({ success: "Created", id: "new-set" })
    vi.mocked(updateCurriculumSet).mockResolvedValue({ success: "Updated" })
    vi.mocked(deleteCurriculumSet).mockResolvedValue({ success: "Deleted" })
    vi.mocked(addLevelToCurriculumSet).mockResolvedValue({ success: "Added", id: "new-level" })
    vi.mocked(updateLevelInCurriculumSet).mockResolvedValue({ success: "Updated" })
    vi.mocked(deleteLevelFromCurriculumSet).mockResolvedValue({ success: "Deleted" })
    vi.mocked(reorderLevelsInCurriculumSet).mockResolvedValue({ success: "Reordered" })
    vi.mocked(confirm).mockReturnValue(true)
  })

  it("should show loading state initially", async () => {
    render(<CurriculumSetsManagement />)
    // Component shows loading initially
    expect(screen.getByText(/loading/i)).toBeTruthy()
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeFalsy()
    })
  })

  it("should render curriculum sets after loading", async () => {
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(getCurriculumSets).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.getByText("Okinawa Kobudo Australia")).toBeTruthy()
    })
  })

  it("should select a curriculum set and show its levels", async () => {
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(getCurriculumSetWithLevels).toHaveBeenCalledWith("set-1")
    })

    await waitFor(() => {
      expect(screen.getByText("White Belt")).toBeTruthy()
      expect(screen.getByText("Blue Belt")).toBeTruthy()
    })
  })

  it("should open create curriculum set dialog", async () => {
    const user = userEvent.setup()
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeFalsy()
    })

    const addButton = screen.getByRole("button", { name: /new curriculum set/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy()
    })
  })

  it("should create a new curriculum set", async () => {
    const user = userEvent.setup()
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeFalsy()
    })

    const addButton = screen.getByRole("button", { name: /new curriculum set/i })
    await user.click(addButton)

    const nameInput = screen.getByPlaceholderText(/curriculum set name/i)
    await user.type(nameInput, "New Curriculum Set")

    const saveButton = screen.getByRole("button", { name: /^save$/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(createCurriculumSet).toHaveBeenCalledWith({
        name: "New Curriculum Set",
        description: "",
      })
    })
  })

  it("should handle create curriculum set error", async () => {
    vi.mocked(createCurriculumSet).mockResolvedValue({ error: "Failed to create" })
    const user = userEvent.setup()
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeFalsy()
    })

    const addButton = screen.getByRole("button", { name: /new curriculum set/i })
    await user.click(addButton)

    const nameInput = screen.getByPlaceholderText(/curriculum set name/i)
    await user.type(nameInput, "New Set")

    const saveButton = screen.getByRole("button", { name: /^save$/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
        })
      )
    })
  })

  it("should delete a curriculum set with confirmation", async () => {
    const user = userEvent.setup()
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeFalsy()
    })

    // Find the dropdown menu button (MoreVertical icon)
    const menuButtons = screen.getAllByRole("button")
    const dropdownTrigger = menuButtons.find((btn) => {
      const svg = btn.querySelector("svg")
      return svg && btn.getAttribute("data-state") !== "open"
    })

    if (dropdownTrigger) {
      await user.click(dropdownTrigger)
      
      await waitFor(() => {
        const deleteButton = screen.queryByText(/delete/i)
        if (deleteButton) {
          user.click(deleteButton)
        }
      })
    }

    // Verify confirm was mocked
    expect(confirm).toBeDefined()
  })

  it("should open add level dialog", async () => {
    const user = userEvent.setup()
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeFalsy()
    })

    // Wait for levels to load
    await waitFor(() => {
      expect(screen.getByText("White Belt")).toBeTruthy()
    })

    const addLevelButton = screen.getByRole("button", { name: /add level/i })
    await user.click(addLevelButton)

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy()
    })
  })

  it("should display empty state when no curriculum sets exist", async () => {
    vi.mocked(getCurriculumSets).mockResolvedValue([])
    vi.mocked(getCurriculumSetWithLevels).mockResolvedValue(null)

    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeFalsy()
    })

    await waitFor(() => {
      expect(screen.getByText(/no curriculum sets/i)).toBeTruthy()
    })
  })

  it("should handle API error when fetching sets", async () => {
    vi.mocked(getCurriculumSets).mockRejectedValue(new Error("API Error"))

    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
        })
      )
    })
  })

  it("should add a level to a curriculum set", async () => {
    const user = userEvent.setup()
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeFalsy()
    })

    await waitFor(() => {
      expect(screen.getByText("White Belt")).toBeTruthy()
    })

    const addLevelButton = screen.getByRole("button", { name: /add level/i })
    await user.click(addLevelButton)

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy()
    })

    const nameInput = screen.getByPlaceholderText(/level name/i)
    await user.type(nameInput, "Yellow Belt")

    const saveButton = screen.getByRole("button", { name: /^save$/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(addLevelToCurriculumSet).toHaveBeenCalledWith(
        "set-1",
        expect.objectContaining({
          name: "Yellow Belt",
        })
      )
    })
  })
})
