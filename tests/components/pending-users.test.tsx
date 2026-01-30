import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PendingUsers from "@/components/pending-users"
import * as actions from "@/lib/actions"

vi.mock("@/lib/actions", () => ({
  fetchPendingUsers: vi.fn(),
  approveUserServerAction: vi.fn(),
  rejectUserServerAction: vi.fn(),
  updatePendingUserFields: vi.fn(),
}))

vi.mock("@/lib/trace-logger", () => ({
  traceError: vi.fn(),
}))

describe("PendingUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should display loading state while fetching users", () => {
    vi.mocked(actions.fetchPendingUsers).mockReturnValue(
      new Promise(() => {}), // Never resolves to keep loading state
    )

    render(<PendingUsers />)

    expect(screen.getByText("Loading pending users...")).toBeTruthy()
  })

  it("should display empty state when no pending users", async () => {
    vi.mocked(actions.fetchPendingUsers).mockResolvedValue({
      data: [],
      error: null,
    })

    render(<PendingUsers />)

    await waitFor(() => {
      expect(screen.getByText("No pending user approvals")).toBeTruthy()
    })
  })

  it("should display pending users list", async () => {
    vi.mocked(actions.fetchPendingUsers).mockResolvedValue({
      data: [
        {
          id: "user-1",
          email: "john@example.com",
          full_name: "John Doe",
          teacher: "Mr. Smith",
          school: "Test School",
          created_at: "2024-01-01T00:00:00Z",
          inviter: null,
        },
      ],
      error: null,
    })

    render(<PendingUsers />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })
    expect(screen.getByText("john@example.com")).toBeTruthy()
    expect(screen.getAllByText(/Mr\. Smith/i)[0]).toBeTruthy()
    expect(screen.getAllByText(/Test School/i)[0]).toBeTruthy()
  })

  it("should display inviter information when user was invited", async () => {
    vi.mocked(actions.fetchPendingUsers).mockResolvedValue({
      data: [
        {
          id: "user-1",
          email: "john@example.com",
          full_name: "John Doe",
          teacher: null,
          school: null,
          created_at: "2024-01-01T00:00:00Z",
          inviter: { full_name: "Admin User" },
        },
      ],
      error: null,
    })

    render(<PendingUsers />)

    await waitFor(() => {
      expect(screen.getByText(/Invited by: Admin User/)).toBeTruthy()
    })
  })

  it("should display direct signup when no inviter", async () => {
    vi.mocked(actions.fetchPendingUsers).mockResolvedValue({
      data: [
        {
          id: "user-1",
          email: "john@example.com",
          full_name: "John Doe",
          teacher: null,
          school: null,
          created_at: "2024-01-01T00:00:00Z",
          inviter: null,
        },
      ],
      error: null,
    })

    render(<PendingUsers />)

    await waitFor(() => {
      expect(screen.getByText("Direct signup")).toBeTruthy()
    })
  })

  it("should approve user when approve button is clicked", async () => {
    const user = userEvent.setup()
    vi.mocked(actions.fetchPendingUsers).mockResolvedValue({
      data: [
        {
          id: "user-1",
          email: "john@example.com",
          full_name: "John Doe",
          teacher: null,
          school: null,
          created_at: "2024-01-01T00:00:00Z",
          inviter: null,
        },
      ],
      error: null,
    })
    vi.mocked(actions.approveUserServerAction).mockResolvedValue({
      data: null,
      error: null,
    })

    render(<PendingUsers />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    // Find the approve button (green button with Check icon)
    const approveButtons = screen.getAllByRole("button")
    const approveButton = approveButtons.find((btn) => btn.className.includes("bg-green-600"))
    expect(approveButton).toBeTruthy()

    await user.click(approveButton!)

    await waitFor(() => {
      expect(actions.approveUserServerAction).toHaveBeenCalledWith("user-1", "Student")
    })

    // User should be removed from the list
    await waitFor(() => {
      expect(screen.queryByText("John Doe")).toBeNull()
    })
  })

  it("should reject user when reject button is clicked", async () => {
    const user = userEvent.setup()
    vi.mocked(actions.fetchPendingUsers).mockResolvedValue({
      data: [
        {
          id: "user-1",
          email: "john@example.com",
          full_name: "John Doe",
          teacher: null,
          school: null,
          created_at: "2024-01-01T00:00:00Z",
          inviter: null,
        },
      ],
      error: null,
    })
    vi.mocked(actions.rejectUserServerAction).mockResolvedValue({
      data: null,
      error: null,
    })

    render(<PendingUsers />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    // Find the reject button (red button with X icon)
    const rejectButtons = screen.getAllByRole("button")
    const rejectButton = rejectButtons.find((btn) => btn.className.includes("border-red-600"))
    expect(rejectButton).toBeTruthy()

    await user.click(rejectButton!)

    await waitFor(() => {
      expect(actions.rejectUserServerAction).toHaveBeenCalledWith("user-1")
    })

    // User should be removed from the list
    await waitFor(() => {
      expect(screen.queryByText("John Doe")).toBeNull()
    })
  })

  it("should allow changing user role before approval", async () => {
    const user = userEvent.setup()
    vi.mocked(actions.fetchPendingUsers).mockResolvedValue({
      data: [
        {
          id: "user-1",
          email: "john@example.com",
          full_name: "John Doe",
          teacher: null,
          school: null,
          created_at: "2024-01-01T00:00:00Z",
          inviter: null,
        },
      ],
      error: null,
    })
    vi.mocked(actions.approveUserServerAction).mockResolvedValue({
      data: null,
      error: null,
    })

    render(<PendingUsers />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    // Find and change the role select
    const roleSelect = screen.getByRole("combobox")
    await user.selectOptions(roleSelect, "Teacher")

    // Approve with the new role
    const approveButtons = screen.getAllByRole("button")
    const approveButton = approveButtons.find((btn) => btn.className.includes("bg-green-600"))
    await user.click(approveButton!)

    await waitFor(() => {
      expect(actions.approveUserServerAction).toHaveBeenCalledWith("user-1", "Teacher")
    })
  })

  it("should open edit mode when edit button is clicked", async () => {
    const user = userEvent.setup()
    vi.mocked(actions.fetchPendingUsers).mockResolvedValue({
      data: [
        {
          id: "user-1",
          email: "john@example.com",
          full_name: "John Doe",
          teacher: "Mr. Smith",
          school: "Test School",
          created_at: "2024-01-01T00:00:00Z",
          inviter: null,
        },
      ],
      error: null,
    })

    render(<PendingUsers />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    // Find the edit button (blue button with Edit2 icon)
    const editButtons = screen.getAllByRole("button")
    const editButton = editButtons.find((btn) => btn.className.includes("border-blue-600"))
    expect(editButton).toBeTruthy()

    await user.click(editButton!)

    // Input fields should appear
    await waitFor(() => {
      const inputs = screen.getAllByRole("textbox")
      expect(inputs.length).toBeGreaterThan(0)
    })
  })

  it("should save edited user fields", async () => {
    const user = userEvent.setup()
    vi.mocked(actions.fetchPendingUsers).mockResolvedValue({
      data: [
        {
          id: "user-1",
          email: "john@example.com",
          full_name: "John Doe",
          teacher: null,
          school: null,
          created_at: "2024-01-01T00:00:00Z",
          inviter: null,
        },
      ],
      error: null,
    })
    vi.mocked(actions.updatePendingUserFields).mockResolvedValue({
      data: null,
      error: null,
    })

    render(<PendingUsers />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    // Click edit button
    const editButtons = screen.getAllByRole("button")
    const editButton = editButtons.find((btn) => btn.className.includes("border-blue-600"))
    await user.click(editButton!)

    // Edit the fields
    await waitFor(() => {
      const inputs = screen.getAllByRole("textbox")
      expect(inputs.length).toBeGreaterThan(0)
    })

    const inputs = screen.getAllByRole("textbox")
    await user.clear(inputs[0])
    await user.type(inputs[0], "Jane Doe")

    // Click save button (blue button with Save icon)
    const saveButtons = screen.getAllByRole("button")
    const saveButton = saveButtons.find((btn) => btn.className.includes("bg-blue-600"))
    await user.click(saveButton!)

    await waitFor(() => {
      expect(actions.updatePendingUserFields).toHaveBeenCalled()
    })
  })

  it("should cancel editing when cancel button is clicked", async () => {
    const user = userEvent.setup()
    vi.mocked(actions.fetchPendingUsers).mockResolvedValue({
      data: [
        {
          id: "user-1",
          email: "john@example.com",
          full_name: "John Doe",
          teacher: null,
          school: null,
          created_at: "2024-01-01T00:00:00Z",
          inviter: null,
        },
      ],
      error: null,
    })

    render(<PendingUsers />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    // Click edit button
    const editButtons = screen.getAllByRole("button")
    const editButton = editButtons.find((btn) => btn.className.includes("border-blue-600"))
    await user.click(editButton!)

    // Wait for edit mode
    await waitFor(() => {
      const inputs = screen.getAllByRole("textbox")
      expect(inputs.length).toBeGreaterThan(0)
    })

    // Click cancel button (gray button with X icon, but not the red reject button)
    const allButtons = screen.getAllByRole("button")
    const cancelButton = allButtons.find(
      (btn) => btn.className.includes("border-gray-600") && !btn.className.includes("border-red-600"),
    )
    expect(cancelButton).toBeTruthy()
    await user.click(cancelButton!)

    // Edit mode should be closed
    await waitFor(() => {
      const inputs = screen.queryAllByRole("textbox")
      // Should only have search input or no inputs if not in edit mode
      expect(inputs.length).toBeLessThan(3)
    })
  })

  it("should display pending count badge", async () => {
    vi.mocked(actions.fetchPendingUsers).mockResolvedValue({
      data: [
        {
          id: "user-1",
          email: "john@example.com",
          full_name: "John Doe",
          teacher: null,
          school: null,
          created_at: "2024-01-01T00:00:00Z",
          inviter: null,
        },
        {
          id: "user-2",
          email: "jane@example.com",
          full_name: "Jane Smith",
          teacher: null,
          school: null,
          created_at: "2024-01-02T00:00:00Z",
          inviter: null,
        },
      ],
      error: null,
    })

    render(<PendingUsers />)

    await waitFor(() => {
      expect(screen.getByText("2 pending")).toBeTruthy()
    })
  })

  it("should handle fetch errors gracefully", async () => {
    vi.mocked(actions.fetchPendingUsers).mockResolvedValue({
      data: null,
      error: "Failed to fetch users",
    })

    render(<PendingUsers />)

    // Should show empty state when fetch fails (error logged via trace system)
    await waitFor(() => {
      expect(screen.getByText("No pending user approvals")).toBeTruthy()
    })
  })
})
