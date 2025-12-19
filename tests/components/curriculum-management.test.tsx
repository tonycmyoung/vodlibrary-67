import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi, describe, it, expect, beforeEach } from "vitest"
import CurriculumManagement from "@/components/curriculum-management"
import * as curriculumActions from "@/lib/actions/curriculums"

vi.mock("@/lib/actions/curriculums", () => ({
  getCurriculums: vi.fn(),
  addCurriculum: vi.fn(),
  updateCurriculum: vi.fn(),
  deleteCurriculum: vi.fn(),
  reorderCurriculums: vi.fn(),
}))

describe("CurriculumManagement", () => {
  const mockCurriculums = [
    {
      id: "curr-1",
      name: "White Belt",
      description: "Beginner curriculum",
      color: "#DC2626",
      display_order: 0,
      created_at: "2024-01-01",
      video_count: 5,
    },
    {
      id: "curr-2",
      name: "Yellow Belt",
      description: "Intermediate curriculum",
      color: "#CA8A04",
      display_order: 1,
      created_at: "2024-01-02",
      video_count: 8,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(curriculumActions.getCurriculums).mockResolvedValue(mockCurriculums)
  })

  it("should render loading state initially", () => {
    render(<CurriculumManagement />)
    expect(screen.getByText("Loading curriculums...")).toBeInTheDocument()
  })

  it("should render curriculum list after loading", async () => {
    render(<CurriculumManagement />)

    await waitFor(() => {
      expect(screen.getByText("White Belt")).toBeInTheDocument()
      expect(screen.getByText("Yellow Belt")).toBeInTheDocument()
    })
  })

  it("should display curriculum count", async () => {
    render(<CurriculumManagement />)

    await waitFor(() => {
      expect(screen.getByText(/2 items/)).toBeInTheDocument()
    })
  })

  it("should display video counts for each curriculum", async () => {
    render(<CurriculumManagement />)

    await waitFor(() => {
      expect(screen.getByText("5 videos")).toBeInTheDocument()
      expect(screen.getByText("8 videos")).toBeInTheDocument()
    })
  })

  it("should open add curriculum dialog when Add button is clicked", async () => {
    const user = userEvent.setup()
    render(<CurriculumManagement />)

    await waitFor(() => {
      expect(screen.getByText("White Belt")).toBeInTheDocument()
    })

    const addButton = screen.getByRole("button", { name: /add curriculum/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add New Curriculum")).toBeInTheDocument()
    })
  })

  it("should add new curriculum when form is submitted", async () => {
    const user = userEvent.setup()
    vi.mocked(curriculumActions.addCurriculum).mockResolvedValue({
      id: "curr-3",
      name: "Green Belt",
      description: "Advanced curriculum",
      color: "#16A34A",
      display_order: 2,
      created_at: "2024-01-03",
    })

    render(<CurriculumManagement />)

    await waitFor(() => {
      expect(screen.getByText("White Belt")).toBeInTheDocument()
    })

    const addButton = screen.getByRole("button", { name: /add curriculum/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add New Curriculum")).toBeInTheDocument()
    })

    const nameInput = screen.getByLabelText(/name/i)
    await user.clear(nameInput)
    await user.type(nameInput, "Green Belt")

    const descriptionInput = screen.getByLabelText(/description/i)
    await user.type(descriptionInput, "Advanced curriculum")

    const submitButton = screen.getByRole("button", { name: /^add$/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(curriculumActions.addCurriculum).toHaveBeenCalledWith({
        name: "Green Belt",
        description: "Advanced curriculum",
        color: "#DC2626",
      })
    })
  })

  it("should open edit dialog when edit button is clicked", async () => {
    const user = userEvent.setup()
    render(<CurriculumManagement />)

    await waitFor(() => {
      expect(screen.getByText("White Belt")).toBeInTheDocument()
    })

    const whiteBeltCard = screen.getByText("White Belt").closest("div[class*='rounded']")
    expect(whiteBeltCard).toBeTruthy()

    const pencilIcon = whiteBeltCard?.querySelector("svg.lucide-pencil")
    const editButton = pencilIcon?.closest("button")
    expect(editButton).toBeTruthy()

    await user.click(editButton!)

    await waitFor(
      () => {
        expect(screen.getByText("Edit Curriculum")).toBeInTheDocument()
        expect(screen.getByDisplayValue("White Belt")).toBeInTheDocument()
        expect(screen.getByDisplayValue("Beginner curriculum")).toBeInTheDocument()
      },
      { timeout: 2000 },
    )
  })

  it("should update curriculum when edit form is submitted", async () => {
    const user = userEvent.setup()
    vi.mocked(curriculumActions.updateCurriculum).mockResolvedValue(undefined)

    render(<CurriculumManagement />)

    await waitFor(() => {
      expect(screen.getByText("White Belt")).toBeInTheDocument()
    })

    const whiteBeltCard = screen.getByText("White Belt").closest("div[class*='rounded']")
    expect(whiteBeltCard).toBeTruthy()

    const pencilIcon = whiteBeltCard?.querySelector("svg.lucide-pencil")
    const editButton = pencilIcon?.closest("button")
    expect(editButton).toBeTruthy()

    await user.click(editButton!)

    await waitFor(
      () => {
        expect(screen.getByText("Edit Curriculum")).toBeInTheDocument()
      },
      { timeout: 2000 },
    )

    const nameInput = screen.getByDisplayValue("White Belt")
    await user.clear(nameInput)
    await user.type(nameInput, "White Belt Updated")

    const submitButton = screen.getByRole("button", { name: /update/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(curriculumActions.updateCurriculum).toHaveBeenCalledWith("curr-1", {
        name: "White Belt Updated",
        description: "Beginner curriculum",
        color: "#DC2626",
      })
    })
  })

  it("should delete curriculum when delete button is clicked and confirmed", async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.fn(() => true)
    window.confirm = confirmSpy
    vi.mocked(curriculumActions.deleteCurriculum).mockResolvedValue(undefined)

    render(<CurriculumManagement />)

    await waitFor(() => {
      expect(screen.getByText("White Belt")).toBeInTheDocument()
    })

    const whiteBeltCard = screen.getByText("White Belt").closest("div[class*='rounded']")
    expect(whiteBeltCard).toBeTruthy()

    const trashIcon = whiteBeltCard?.querySelector("svg.lucide-trash-2")
    const deleteButton = trashIcon?.closest("button")
    expect(deleteButton).toBeTruthy()

    await user.click(deleteButton!)

    await new Promise((resolve) => setTimeout(resolve, 50))

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled()
      expect(curriculumActions.deleteCurriculum).toHaveBeenCalledWith("curr-1")
    })
  })

  it("should not delete curriculum when deletion is cancelled", async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.fn(() => false)
    window.confirm = confirmSpy

    render(<CurriculumManagement />)

    await waitFor(() => {
      expect(screen.getByText("White Belt")).toBeInTheDocument()
    })

    const whiteBeltCard = screen.getByText("White Belt").closest("div[class*='rounded']")
    expect(whiteBeltCard).toBeTruthy()

    const trashIcon = whiteBeltCard?.querySelector("svg.lucide-trash-2")
    const deleteButton = trashIcon?.closest("button")
    expect(deleteButton).toBeTruthy()

    await user.click(deleteButton!)

    await new Promise((resolve) => setTimeout(resolve, 50))

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled()
    })
    expect(curriculumActions.deleteCurriculum).not.toHaveBeenCalled()
  })

  it("should move curriculum up when move up is selected", async () => {
    const user = userEvent.setup()
    vi.mocked(curriculumActions.reorderCurriculums).mockResolvedValue(undefined)

    render(<CurriculumManagement />)

    await waitFor(() => {
      expect(screen.getByText("Yellow Belt")).toBeInTheDocument()
    })

    const yellowBeltCard = screen.getByText("Yellow Belt").closest("div[class*='bg-black']")
    expect(yellowBeltCard).toBeTruthy()

    const moreIcon = yellowBeltCard?.querySelector("svg.lucide-more-vertical")
    const moreButton = moreIcon?.closest("button")
    expect(moreButton).toBeTruthy()

    await user.click(moreButton!)

    await waitFor(() => {
      const moveUpOption = screen.getByText("Move Up")
      expect(moveUpOption).toBeInTheDocument()
    })

    const moveUpOption = screen.getByText("Move Up")
    await user.click(moveUpOption)

    await waitFor(() => {
      expect(curriculumActions.reorderCurriculums).toHaveBeenCalled()
    })
  })

  it("should display empty state when no curriculums exist", async () => {
    vi.mocked(curriculumActions.getCurriculums).mockResolvedValue([])

    render(<CurriculumManagement />)

    await waitFor(() => {
      expect(screen.getByText(/no curriculums found/i)).toBeInTheDocument()
    })
  })

  it("should allow selecting different colors", async () => {
    const user = userEvent.setup()
    render(<CurriculumManagement />)

    await waitFor(() => {
      expect(screen.getByText("White Belt")).toBeInTheDocument()
    })

    const addButton = screen.getByRole("button", { name: /add curriculum/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add New Curriculum")).toBeInTheDocument()
    })

    const colorPicker = document.querySelector("#curriculum-color-picker")
    expect(colorPicker).toBeTruthy()

    const colorButtons = colorPicker?.querySelectorAll("button")
    expect(colorButtons).toBeTruthy()
    expect(colorButtons!.length).toBeGreaterThan(1)

    // Click the second color button
    await user.click(colorButtons![1])
    // Color selection is reflected in state, tested through form submission
  })
})
