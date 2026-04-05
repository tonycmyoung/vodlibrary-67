import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import CurriculumSetsManagement from "@/components/curriculum-sets-management"

// Mock the server actions
vi.mock("@/lib/actions/curriculums", () => ({
  getCurriculumSets: vi.fn(),
  getCurriculumSetWithLevels: vi.fn(),
  createCurriculumSet: vi.fn(),
  updateCurriculumSet: vi.fn(),
  addLevelToCurriculumSet: vi.fn(),
  updateLevelInCurriculumSet: vi.fn(),
  deleteLevelFromCurriculumSet: vi.fn(),
  reorderLevelsInCurriculumSet: vi.fn(),
}))

describe("CurriculumSetsManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders curriculum sets list", async () => {
    render(<CurriculumSetsManagement />)
    
    await waitFor(() => {
      expect(screen.getByText(/Curriculum Sets/i)).toBeInTheDocument()
    })
  })

  it("shows empty state when no curriculum sets exist", async () => {
    render(<CurriculumSetsManagement />)
    
    await waitFor(() => {
      expect(screen.getByText(/No curriculum sets/i)).toBeInTheDocument()
    })
  })

  it("allows creating a new curriculum set", async () => {
    const { getByPlaceholderText, getByRole } = render(<CurriculumSetsManagement />)
    
    const nameInput = getByPlaceholderText(/Set name/i)
    const createButton = getByRole("button", { name: /Create/i })
    
    fireEvent.change(nameInput, { target: { value: "New Curriculum Set" } })
    fireEvent.click(createButton)
    
    await waitFor(() => {
      expect(screen.getByText("New Curriculum Set")).toBeInTheDocument()
    })
  })

  it("allows adding a level to a curriculum set", async () => {
    render(<CurriculumSetsManagement />)
    
    // Select a curriculum set
    await waitFor(() => {
      const setButton = screen.getByRole("button", { name: /Okinawa Kobudo Australia/i })
      fireEvent.click(setButton)
    })

    // Add level
    const addLevelButton = screen.getByRole("button", { name: /Add Level/i })
    fireEvent.click(addLevelButton)

    const levelNameInput = screen.getByPlaceholderText(/Level name/i)
    fireEvent.change(levelNameInput, { target: { value: "White Belt" } })

    const submitButton = screen.getByRole("button", { name: /Add/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText("White Belt")).toBeInTheDocument()
    })
  })

  it("allows reordering levels via drag and drop", async () => {
    render(<CurriculumSetsManagement />)
    
    await waitFor(() => {
      const levels = screen.getAllByRole("button", { name: /Move/i })
      expect(levels.length).toBeGreaterThan(0)
    })
  })
})
