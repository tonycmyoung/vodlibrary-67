import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, cleanup } from "@testing-library/react"
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

vi.mock("@/lib/actions/curriculums")
vi.mock("@/hooks/use-toast")

global.confirm = vi.fn()

describe("CurriculumSetsManagement", () => {
  const mockToast = vi.fn()

  const mockSets = [
    { id: "set-1", name: "Test Curriculum Set", description: "Test description", created_at: "2024-01-01" },
    { id: "set-2", name: "Another Set", description: null, created_at: "2024-01-02" },
  ]

  const mockSetWithLevels = {
    id: "set-1",
    name: "Test Curriculum Set",
    description: "Test description",
    created_at: "2024-01-01",
    levels: [
      { id: "level-1", name: "First Level", description: null, color: "#ffffff", display_order: 0, curriculum_set_id: "set-1" },
      { id: "level-2", name: "Second Level", description: null, color: "#0000ff", display_order: 1, curriculum_set_id: "set-1" },
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

  afterEach(() => {
    cleanup()
  })

  it("should show loading state initially", async () => {
    vi.mocked(getCurriculumSets).mockReturnValue(new Promise(() => {}))
    
    const { unmount } = render(<CurriculumSetsManagement />)
    expect(screen.getByText(/loading/i)).toBeTruthy()
    unmount()
  })

  it("should render curriculum sets after loading", async () => {
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(getCurriculumSets).toHaveBeenCalled()
    })

    await waitFor(() => {
      const elements = screen.getAllByText("Test Curriculum Set")
      expect(elements.length).toBeGreaterThan(0)
    })
  })

  it("should fetch levels when a curriculum set is loaded", async () => {
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(getCurriculumSetWithLevels).toHaveBeenCalledWith("set-1")
    })

    await waitFor(() => {
      expect(screen.getByText("First Level")).toBeTruthy()
      expect(screen.getByText("Second Level")).toBeTruthy()
    })
  })

  it("should call createCurriculumSet when create button is clicked", async () => {
    const user = userEvent.setup()
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeFalsy()
    })

    const addButton = screen.getByRole("button", { name: /new curriculum set/i })
    await user.click(addButton)

    // Find the name input by its id
    const nameInput = document.getElementById("set-name") as HTMLInputElement
    expect(nameInput).toBeTruthy()
    await user.type(nameInput, "New Curriculum Set")

    // Find create button within the dialog form
    const createButton = screen.getByRole("button", { name: /^create$/i })
    await user.click(createButton)

    await waitFor(() => {
      expect(createCurriculumSet).toHaveBeenCalledWith({
        name: "New Curriculum Set",
        description: "",
      })
    })
  })

  it("should show toast on create error", async () => {
    vi.mocked(createCurriculumSet).mockResolvedValue({ error: "Failed to create" })
    const user = userEvent.setup()
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeFalsy()
    })

    const addButton = screen.getByRole("button", { name: /new curriculum set/i })
    await user.click(addButton)

    const nameInput = document.getElementById("set-name") as HTMLInputElement
    await user.type(nameInput, "New Set")

    const createButton = screen.getByRole("button", { name: /^create$/i })
    await user.click(createButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
        })
      )
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

  it("should call addLevelToCurriculumSet when add level is submitted", async () => {
    const user = userEvent.setup()
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeFalsy()
    })

    await waitFor(() => {
      expect(screen.getByText("First Level")).toBeTruthy()
    })

    const addLevelButton = screen.getByRole("button", { name: /add level/i })
    await user.click(addLevelButton)

    // Find the level name input by its id
    const nameInput = document.getElementById("level-name") as HTMLInputElement
    expect(nameInput).toBeTruthy()
    await user.type(nameInput, "Yellow Belt")

    // The Add Level dialog has an "Add" button, not "Save"
    const addButton = screen.getByRole("button", { name: /^add$/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(addLevelToCurriculumSet).toHaveBeenCalledWith(
        "set-1",
        expect.objectContaining({
          name: "Yellow Belt",
        })
      )
    })
  })

  it("should show levels when a curriculum set is selected", async () => {
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeFalsy()
    })

    await waitFor(() => {
      expect(screen.getByText("First Level")).toBeTruthy()
      expect(screen.getByText("Second Level")).toBeTruthy()
    })
  })

  it("should have delete confirmation mocked", async () => {
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeFalsy()
    })

    expect(confirm).toBeDefined()
  })

  it("should call deleteLevelFromCurriculumSet when delete level is confirmed", async () => {
    vi.mocked(confirm).mockReturnValue(true)
    const user = userEvent.setup()
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeFalsy()
    })

    await waitFor(() => {
      expect(screen.getByText("First Level")).toBeTruthy()
    })

    // Open the dropdown menu for the first level
    const moreButtons = screen.getAllByRole("button", { name: "" })
    const levelMoreButton = moreButtons.find(btn => btn.querySelector('svg'))
    if (levelMoreButton) {
      await user.click(levelMoreButton)
    }

    // Look for delete option and click it
    const deleteOption = await screen.findByText(/delete/i)
    await user.click(deleteOption)

    await waitFor(() => {
      expect(deleteLevelFromCurriculumSet).toHaveBeenCalled()
    })
  })

  it("should open edit dialog when edit level is clicked", async () => {
    const user = userEvent.setup()
    render(<CurriculumSetsManagement />)

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeFalsy()
    })

    await waitFor(() => {
      expect(screen.getByText("First Level")).toBeTruthy()
    })

    // Open the dropdown menu for a level
    const moreButtons = screen.getAllByRole("button", { name: "" })
    const levelMoreButton = moreButtons.find(btn => btn.querySelector('svg'))
    if (levelMoreButton) {
      await user.click(levelMoreButton)
    }

    // Click edit option
    const editOption = await screen.findByText(/edit/i)
    await user.click(editOption)

    // Check that the edit dialog is populated with the level data
    await waitFor(() => {
      const nameInput = document.getElementById("level-name") as HTMLInputElement
      expect(nameInput?.value).toBe("First Level")
    })
  })
})
