import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import PerformerManagement from "@/components/performer-management"
import { createBrowserClient } from "@/lib/supabase/client"
import { addPerformer, updatePerformer, deletePerformer } from "@/lib/actions"
import jest from "jest"

jest.mock("@/lib/supabase/client")
jest.mock("@/lib/actions")

const mockCreateBrowserClient = createBrowserClient as jest.MockedFunction<typeof createBrowserClient>
const mockAddPerformer = addPerformer as jest.MockedFunction<typeof addPerformer>
const mockUpdatePerformer = updatePerformer as jest.MockedFunction<typeof updatePerformer>
const mockDeletePerformer = deletePerformer as jest.MockedFunction<typeof deletePerformer>

describe("PerformerManagement", () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [
          {
            id: "1",
            name: "John Doe",
            created_at: "2024-01-01",
            video_performers: [{ count: 5 }],
          },
          {
            id: "2",
            name: "Jane Smith",
            created_at: "2024-01-02",
            video_performers: [{ count: 3 }],
          },
        ],
        error: null,
      }),
    }

    mockCreateBrowserClient.mockReturnValue(mockSupabase)
    mockAddPerformer.mockResolvedValue({ error: null })
    mockUpdatePerformer.mockResolvedValue({ error: null })
    mockDeletePerformer.mockResolvedValue({ error: null })

    // Mock window.confirm
    global.confirm = jest.fn().mockReturnValue(true)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should render loading state initially", () => {
    render(<PerformerManagement />)
    expect(screen.getByText("Loading performers...")).toBeInTheDocument()
  })

  it("should render performers list after loading", async () => {
    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    expect(screen.getByText("Jane Smith")).toBeInTheDocument()
    expect(screen.getByText("5 videos")).toBeInTheDocument()
    expect(screen.getByText("3 videos")).toBeInTheDocument()
  })

  it("should display performer count in header", async () => {
    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("Performers (2)")).toBeInTheDocument()
    })
  })

  it("should display empty state when no performers", async () => {
    mockSupabase.order.mockResolvedValueOnce({
      data: [],
      error: null,
    })

    render(<PerformerManagement />)

    await waitFor(() => {
      expect(
        screen.getByText(/No performers found. Add performers here and assign them to videos/i),
      ).toBeInTheDocument()
    })
  })

  it("should display singular 'video' for performer with 1 video", async () => {
    mockSupabase.order.mockResolvedValueOnce({
      data: [
        {
          id: "1",
          name: "Solo Performer",
          created_at: "2024-01-01",
          video_performers: [{ count: 1 }],
        },
      ],
      error: null,
    })

    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("1 video")).toBeInTheDocument()
    })
  })

  it("should add new performer when Add button clicked", async () => {
    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText("Performer name")
    const addButton = screen.getAllByRole("button").find((btn) => btn.textContent?.includes("Add"))

    fireEvent.change(input, { target: { value: "New Performer" } })
    fireEvent.click(addButton!)

    await waitFor(() => {
      expect(mockAddPerformer).toHaveBeenCalledWith("New Performer")
    })

    expect(input).toHaveValue("")
  })

  it("should add performer when Enter key pressed in input", async () => {
    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText("Performer name")

    fireEvent.change(input, { target: { value: "Keyboard Performer" } })
    fireEvent.keyPress(input, { key: "Enter", code: "Enter", charCode: 13 })

    await waitFor(() => {
      expect(mockAddPerformer).toHaveBeenCalledWith("Keyboard Performer")
    })
  })

  it("should not add performer with empty name", async () => {
    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const addButton = screen.getAllByRole("button").find((btn) => btn.textContent?.includes("Add"))

    fireEvent.click(addButton!)

    await waitFor(() => {
      expect(mockAddPerformer).not.toHaveBeenCalled()
    })
  })

  it("should enter edit mode when edit button clicked", async () => {
    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    // Find John Doe's card
    const johnDoeText = screen.getByText("John Doe")
    const performerCard = johnDoeText.closest(".flex.items-center.justify-between")

    // Find the edit button (Pencil icon) within this card
    const editButton = performerCard?.querySelector("svg.lucide-pencil")?.closest("button") as HTMLButtonElement

    fireEvent.click(editButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument()
    })

    expect(screen.getByText("Save")).toBeInTheDocument()
    expect(screen.getByText("Cancel")).toBeInTheDocument()
  })

  it("should update performer when Save button clicked", async () => {
    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    // Enter edit mode
    const johnDoeText = screen.getByText("John Doe")
    const performerCard = johnDoeText.closest(".flex.items-center.justify-between")
    const editButton = performerCard?.querySelector("svg.lucide-pencil")?.closest("button") as HTMLButtonElement

    fireEvent.click(editButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument()
    })

    // Edit the name
    const input = screen.getByDisplayValue("John Doe")
    fireEvent.change(input, { target: { value: "Updated Name" } })

    // Find and click Save button
    const saveButton = screen.getAllByRole("button").find((btn) => btn.textContent === "Save")
    fireEvent.click(saveButton!)

    await waitFor(() => {
      expect(mockUpdatePerformer).toHaveBeenCalledWith("1", "Updated Name")
    })
  })

  it("should update performer when Enter key pressed in edit input", async () => {
    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    // Enter edit mode
    const johnDoeText = screen.getByText("John Doe")
    const performerCard = johnDoeText.closest(".flex.items-center.justify-between")
    const editButton = performerCard?.querySelector("svg.lucide-pencil")?.closest("button") as HTMLButtonElement

    fireEvent.click(editButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument()
    })

    // Edit the name and press Enter
    const input = screen.getByDisplayValue("John Doe")
    fireEvent.change(input, { target: { value: "Keyboard Edit" } })
    fireEvent.keyPress(input, { key: "Enter", code: "Enter", charCode: 13 })

    await waitFor(() => {
      expect(mockUpdatePerformer).toHaveBeenCalledWith("1", "Keyboard Edit")
    })
  })

  it("should cancel edit mode when Cancel button clicked", async () => {
    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    // Enter edit mode
    const johnDoeText = screen.getByText("John Doe")
    const performerCard = johnDoeText.closest(".flex.items-center.justify-between")
    const editButton = performerCard?.querySelector("svg.lucide-pencil")?.closest("button") as HTMLButtonElement

    fireEvent.click(editButton)

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument()
    })

    // Click Cancel
    const cancelButton = screen.getByText("Cancel")
    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByText("Save")).not.toBeInTheDocument()
    })

    expect(screen.queryByDisplayValue("John Doe")).not.toBeInTheDocument()
  })

  it("should not update performer with empty name", async () => {
    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    // Enter edit mode
    const johnDoeText = screen.getByText("John Doe")
    const performerCard = johnDoeText.closest(".flex.items-center.justify-between")
    const editButton = performerCard?.querySelector("svg.lucide-pencil")?.closest("button") as HTMLButtonElement

    fireEvent.click(editButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument()
    })

    // Clear the name
    const input = screen.getByDisplayValue("John Doe")
    fireEvent.change(input, { target: { value: "" } })

    // Try to save
    const saveButton = screen.getAllByRole("button").find((btn) => btn.textContent === "Save")
    fireEvent.click(saveButton!)

    await waitFor(() => {
      expect(mockUpdatePerformer).not.toHaveBeenCalled()
    })
  })

  it("should delete performer when delete button clicked and confirmed", async () => {
    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    // Find John Doe's card and delete button
    const johnDoeText = screen.getByText("John Doe")
    const performerCard = johnDoeText.closest(".flex.items-center.justify-between")
    const deleteButton = performerCard?.querySelector("svg.lucide-trash-2")?.closest("button") as HTMLButtonElement

    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete "John Doe"? This will remove them from all videos.',
      )
    })

    expect(mockDeletePerformer).toHaveBeenCalledWith("1")
  })

  it("should not delete performer when deletion is cancelled", async () => {
    global.confirm = jest.fn().mockReturnValue(false)

    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    // Find and click delete button
    const johnDoeText = screen.getByText("John Doe")
    const performerCard = johnDoeText.closest(".flex.items-center.justify-between")
    const deleteButton = performerCard?.querySelector("svg.lucide-trash-2")?.closest("button") as HTMLButtonElement

    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalled()
    })

    expect(mockDeletePerformer).not.toHaveBeenCalled()
  })

  it("should display success message after adding performer", async () => {
    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText("Performer name")
    const addButton = screen.getAllByRole("button").find((btn) => btn.textContent?.includes("Add"))

    fireEvent.change(input, { target: { value: "New Performer" } })
    fireEvent.click(addButton!)

    await waitFor(() => {
      expect(screen.getByText("Performer added successfully")).toBeInTheDocument()
    })
  })

  it("should display success message after updating performer", async () => {
    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    // Enter edit mode and update
    const johnDoeText = screen.getByText("John Doe")
    const performerCard = johnDoeText.closest(".flex.items-center.justify-between")
    const editButton = performerCard?.querySelector("svg.lucide-pencil")?.closest("button") as HTMLButtonElement

    fireEvent.click(editButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument()
    })

    const input = screen.getByDisplayValue("John Doe")
    fireEvent.change(input, { target: { value: "Updated" } })

    const saveButton = screen.getAllByRole("button").find((btn) => btn.textContent === "Save")
    fireEvent.click(saveButton!)

    await waitFor(() => {
      expect(screen.getByText("Performer updated successfully")).toBeInTheDocument()
    })
  })

  it("should display success message after deleting performer", async () => {
    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const johnDoeText = screen.getByText("John Doe")
    const performerCard = johnDoeText.closest(".flex.items-center.justify-between")
    const deleteButton = performerCard?.querySelector("svg.lucide-trash-2")?.closest("button") as HTMLButtonElement

    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText("Performer deleted successfully")).toBeInTheDocument()
    })
  })

  it("should display error message when fetching performers fails", async () => {
    mockSupabase.order.mockResolvedValueOnce({
      data: null,
      error: { message: "Database error" },
    })

    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("Failed to load performers")).toBeInTheDocument()
    })
  })

  it("should display error message when adding performer fails", async () => {
    mockAddPerformer.mockResolvedValueOnce({ error: "Name already exists" })

    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText("Performer name")
    const addButton = screen.getAllByRole("button").find((btn) => btn.textContent?.includes("Add"))

    fireEvent.change(input, { target: { value: "Duplicate" } })
    fireEvent.click(addButton!)

    await waitFor(() => {
      expect(screen.getByText("Error adding performer: Name already exists")).toBeInTheDocument()
    })
  })

  it("should display error message when updating performer fails", async () => {
    mockUpdatePerformer.mockResolvedValueOnce({ error: "Update failed" })

    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    // Enter edit mode and try to update
    const johnDoeText = screen.getByText("John Doe")
    const performerCard = johnDoeText.closest(".flex.items-center.justify-between")
    const editButton = performerCard?.querySelector("svg.lucide-pencil")?.closest("button") as HTMLButtonElement

    fireEvent.click(editButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument()
    })

    const input = screen.getByDisplayValue("John Doe")
    fireEvent.change(input, { target: { value: "Updated" } })

    const saveButton = screen.getAllByRole("button").find((btn) => btn.textContent === "Save")
    fireEvent.click(saveButton!)

    await waitFor(() => {
      expect(screen.getByText("Failed to update performer")).toBeInTheDocument()
    })
  })

  it("should display error message when deleting performer fails", async () => {
    mockDeletePerformer.mockResolvedValueOnce({ error: "Delete failed" })

    render(<PerformerManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const johnDoeText = screen.getByText("John Doe")
    const performerCard = johnDoeText.closest(".flex.items-center.justify-between")
    const deleteButton = performerCard?.querySelector("svg.lucide-trash-2")?.closest("button") as HTMLButtonElement

    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText("Failed to delete performer")).toBeInTheDocument()
    })
  })
})
