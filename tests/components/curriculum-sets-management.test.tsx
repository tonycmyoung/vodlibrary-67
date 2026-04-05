import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import CurriculumSetsManagement from "@/components/curriculum-sets-management"

vi.mock("@/lib/actions/curriculums")

describe("CurriculumSetsManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render the component with header text", async () => {
    render(<CurriculumSetsManagement />)
    
    expect(screen.getByText("Manage curriculum sets and their levels")).toBeTruthy()
    expect(screen.getByText("New Curriculum Set")).toBeTruthy()
  })

  it("should render curriculum sets list", async () => {
    render(<CurriculumSetsManagement />)
    
    await waitFor(() => {
      expect(screen.getByText("Curriculum Sets")).toBeTruthy()
    })
  })

  it("should render levels list", async () => {
    render(<CurriculumSetsManagement />)
    
    await waitFor(() => {
      expect(screen.getByText("Levels")).toBeTruthy()
    })
  })

  it("should have create button", () => {
    render(<CurriculumSetsManagement />)
    
    const createButton = screen.getByRole("button", { name: /New Curriculum Set/i })
    expect(createButton).toBeTruthy()
  })
})
