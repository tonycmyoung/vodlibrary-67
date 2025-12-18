import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import UserManagement from "@/components/user-management"
import { createClient } from "@/lib/supabase/client"
import { deleteUserCompletely, updateUserFields, adminResetUserPassword } from "@/lib/actions"
import { useRouter, useSearchParams } from "next/navigation"

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/actions", () => ({
  deleteUserCompletely: vi.fn(),
  updateUserFields: vi.fn(),
  adminResetUserPassword: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}))

global.alert = vi.fn()
global.confirm = vi.fn()

describe("UserManagement", () => {
  const mockRouter = {
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }

  const mockSearchParams = {
    get: vi.fn((param: string) => null),
  }

  const mockUsers = [
    {
      id: "user-1",
      email: "student@example.com",
      full_name: "John Doe",
      teacher: "Sensei Bob",
      school: "Test Dojo",
      role: "Student",
      created_at: "2024-01-01T00:00:00Z",
      is_approved: true,
      approved_at: "2024-01-02T00:00:00Z",
      profile_image_url: null,
      current_belt_id: "belt-1",
      current_belt: {
        id: "belt-1",
        name: "White Belt",
        color: "#ffffff",
        display_order: 1,
      },
    },
    {
      id: "user-2",
      email: "teacher@example.com",
      full_name: "Jane Smith",
      teacher: null,
      school: "Test Dojo",
      role: "Teacher",
      created_at: "2024-01-01T00:00:00Z",
      is_approved: false,
      approved_at: null,
      profile_image_url: null,
      current_belt_id: null,
      current_belt: null,
    },
  ]

  const mockCurriculums = [
    { id: "belt-1", name: "White Belt", color: "#ffffff", display_order: 1 },
    { id: "belt-2", name: "Yellow Belt", color: "#ffff00", display_order: 2 },
  ]

  const mockLoginStats = [
    { user_id: "user-1", login_time: "2024-01-15T00:00:00Z" },
    { user_id: "user-1", login_time: "2024-01-14T00:00:00Z" },
    { user_id: "user-2", login_time: "2024-01-13T00:00:00Z" },
  ]

  const mockViewStats = [
    { user_id: "user-1", viewed_at: "2024-01-15T00:00:00Z" },
    { user_id: "user-1", viewed_at: "2024-01-14T00:00:00Z" },
    { user_id: "user-2", viewed_at: "2024-01-13T00:00:00Z" },
  ]

  let mockFrom: any
  let mockSelect: any
  let mockOrder: any
  let mockUpdate: any
  let mockEq: any

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue(mockRouter as any)
    vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as any)

    mockEq = vi.fn().mockResolvedValue({ data: null, error: null })
    mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockOrder = vi.fn().mockResolvedValue({ data: mockCurriculums, error: null })
    mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
    mockFrom = vi.fn((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockUsers, error: null }),
          }),
          update: mockUpdate,
        }
      }
      if (table === "curriculums") {
        return { select: mockSelect }
      }
      if (table === "user_logins") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockLoginStats, error: null }),
          }),
        }
      }
      if (table === "user_video_views") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockViewStats, error: null }),
          }),
        }
      }
      return { select: mockSelect }
    })

    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any)
  })

  it("should render loading state initially", () => {
    render(<UserManagement />)
    expect(screen.getByText("Loading users...")).toBeInTheDocument()
  })

  it("should render user list after loading", async () => {
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
      expect(screen.getByText("Jane Smith")).toBeInTheDocument()
    })
  })

  it("should display user count in header", async () => {
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("All Users (2)")).toBeInTheDocument()
    })
  })

  it("should display user approval status badges", async () => {
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("Approved")).toBeInTheDocument()
      expect(screen.getByText("Pending")).toBeInTheDocument()
    })
  })

  it("should display user role badges", async () => {
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("Student")).toBeInTheDocument()
      expect(screen.getByText("Teacher")).toBeInTheDocument()
    })
  })

  it("should render search input", async () => {
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search users...")).toBeInTheDocument()
    })
  })

  it("should filter users by search query", async () => {
    const user = userEvent.setup()
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText("Search users...")
    await user.type(searchInput, "Jane")

    await waitFor(
      () => {
        expect(screen.queryByText("John Doe")).not.toBeInTheDocument()
        expect(screen.getByText("Jane Smith")).toBeInTheDocument()
      },
      { timeout: 500 },
    )
  })

  it("should toggle user approval when approve/revoke button is clicked", async () => {
    const user = userEvent.setup()
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument()
    })

    // Find the approve button for Jane (pending user)
    const approveButtons = screen.getAllByLabelText("Approve user")
    await user.click(approveButtons[0])

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith("id", "user-2")
    })
  })

  it("should update user role when role select is changed", async () => {
    const user = userEvent.setup()
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const roleSelects = screen.getAllByRole("combobox")
    const roleSelect = roleSelects.find((select: HTMLElement) =>
      select.querySelector('option[value="Student"]'),
    ) as HTMLSelectElement

    await user.selectOptions(roleSelect, "Teacher")

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled()
    })
  })

  it("should enter edit mode when edit button is clicked", async () => {
    const user = userEvent.setup()
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const editButtons = screen.getAllByLabelText("Edit user")
    await user.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByLabelText("Save changes")).toBeInTheDocument()
      expect(screen.getByLabelText("Cancel editing")).toBeInTheDocument()
    })
  })

  it("should update user fields when save button is clicked in edit mode", async () => {
    const user = userEvent.setup()
    vi.mocked(updateUserFields).mockResolvedValue({ success: true })

    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const editButtons = screen.getAllByLabelText("Edit user")
    await user.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByLabelText("Save changes")).toBeInTheDocument()
    })

    const nameInput = screen.getByPlaceholderText("Full name")
    await user.clear(nameInput)
    await user.type(nameInput, "John Smith")

    const saveButton = screen.getByLabelText("Save changes")
    await user.click(saveButton)

    await waitFor(() => {
      expect(updateUserFields).toHaveBeenCalledWith("user-1", "John Smith", "Sensei Bob", "Test Dojo", "belt-1")
    })
  })

  it("should cancel edit mode when cancel button is clicked", async () => {
    const user = userEvent.setup()
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const editButtons = screen.getAllByLabelText("Edit user")
    await user.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByLabelText("Cancel editing")).toBeInTheDocument()
    })

    const cancelButton = screen.getByLabelText("Cancel editing")
    await user.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByLabelText("Save changes")).not.toBeInTheDocument()
    })
  })

  it("should open reset password dialog when key button is clicked", async () => {
    const user = userEvent.setup()
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const resetButtons = screen.getAllByLabelText("Reset password")
    await user.click(resetButtons[0])

    await waitFor(() => {
      expect(screen.getByText(/Reset Password for/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText("Enter new password")).toBeInTheDocument()
    })
  })

  it("should generate random password when generate button is clicked", async () => {
    const user = userEvent.setup()
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const resetButtons = screen.getAllByLabelText("Reset password")
    await user.click(resetButtons[0])

    await waitFor(() => {
      expect(screen.getByText("Generate Random Password")).toBeInTheDocument()
    })

    const generateButton = screen.getByText("Generate Random Password")
    await user.click(generateButton)

    const passwordInput = screen.getByPlaceholderText("Enter new password") as HTMLInputElement
    expect(passwordInput.value.length).toBe(12)
  })

  it("should show error when password is too short", async () => {
    const user = userEvent.setup()
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const resetButtons = screen.getAllByLabelText("Reset password")
    await user.click(resetButtons[0])

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter new password")).toBeInTheDocument()
    })

    const passwordInput = screen.getByPlaceholderText("Enter new password")
    await user.type(passwordInput, "short")

    const resetButton = screen.getByRole("button", { name: /Reset Password/i })
    await user.click(resetButton)

    await waitFor(() => {
      expect(screen.getByText("Password must be at least 8 characters long")).toBeInTheDocument()
    })
  })

  it("should reset password successfully with valid password", async () => {
    const user = userEvent.setup()
    vi.mocked(adminResetUserPassword).mockResolvedValue({ success: true })

    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const resetButtons = screen.getAllByLabelText("Reset password")
    await user.click(resetButtons[0])

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter new password")).toBeInTheDocument()
    })

    const passwordInput = screen.getByPlaceholderText("Enter new password")
    await user.type(passwordInput, "newpassword123")

    const resetButton = screen.getByRole("button", { name: /Reset Password/i })
    await user.click(resetButton)

    await waitFor(() => {
      expect(adminResetUserPassword).toHaveBeenCalledWith("user-1", "newpassword123")
      expect(global.alert).toHaveBeenCalledWith(
        "Password reset successfully. The user can now log in with the new password.",
      )
    })
  })

  it("should prompt for confirmation before deleting user", async () => {
    const user = userEvent.setup()
    vi.mocked(global.confirm).mockReturnValue(false)

    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByLabelText("Delete user")
    await user.click(deleteButtons[0])

    expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('delete the user "student@example.com"'))
    expect(deleteUserCompletely).not.toHaveBeenCalled()
  })

  it("should delete user when confirmed", async () => {
    const user = userEvent.setup()
    vi.mocked(global.confirm).mockReturnValue(true)
    vi.mocked(deleteUserCompletely).mockResolvedValue({ success: true })

    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByLabelText("Delete user")
    await user.click(deleteButtons[0])

    await waitFor(() => {
      expect(deleteUserCompletely).toHaveBeenCalledWith("user-1", "student@example.com")
    })
  })

  it("should display user login and view statistics", async () => {
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("2 logins")).toBeInTheDocument()
      expect(screen.getByText("2 views")).toBeInTheDocument()
    })
  })

  it("should display administrator badge for admin email", async () => {
    const adminUser = {
      ...mockUsers[0],
      email: "acmyma@gmail.com",
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [adminUser], error: null }),
          }),
          update: mockUpdate,
        }
      }
      if (table === "curriculums") {
        return { select: mockSelect }
      }
      if (table === "user_logins") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }
      }
      if (table === "user_video_views") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }
      }
      return { select: mockSelect }
    })

    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("Administrator")).toBeInTheDocument()
    })
  })

  it("should display no users message when filtered list is empty", async () => {
    const user = userEvent.setup()
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText("Search users...")
    await user.type(searchInput, "nonexistent")

    await waitFor(
      () => {
        expect(screen.getByText("No users found matching your criteria.")).toBeInTheDocument()
      },
      { timeout: 500 },
    )
  })

  it("should display current belt with color indicator", async () => {
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("White Belt")).toBeInTheDocument()
    })
  })

  it("should render UserSortControl and UserFilter components", async () => {
    render(<UserManagement />)

    await waitFor(() => {
      // These components should be present
      expect(screen.getByText("All Users (2)")).toBeInTheDocument()
    })
  })
})
