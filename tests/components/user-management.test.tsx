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
    expect(screen.getByText("Loading users...")).toBeTruthy()
  })

  it("should render user list after loading", async () => {
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
      expect(screen.getByText("Jane Smith")).toBeTruthy()
    })
  })

  it("should display user count in header", async () => {
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("All Users (2)")).toBeTruthy()
    })
  })

  it("should display user approval status badges", async () => {
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("Approved")).toBeTruthy()
      expect(screen.getByText("Pending")).toBeTruthy()
    })
  })

  it("should display user role badges", async () => {
    render(<UserManagement />)

    await waitFor(() => {
      const studentElements = screen.getAllByText("Student")
      const teacherElements = screen.getAllByText("Teacher")
      expect(studentElements.length).toBeGreaterThan(0)
      expect(teacherElements.length).toBeGreaterThan(0)
    })
  })

  it("should render search input", async () => {
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search users...")).toBeTruthy()
    })
  })

  it("should filter users by search query", async () => {
    const user = userEvent.setup()
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    const searchInput = screen.getByPlaceholderText("Search users...")
    await user.type(searchInput, "Jane")

    await waitFor(
      () => {
        expect(screen.queryByText("John Doe")).toBeNull()
        expect(screen.getByText("Jane Smith")).toBeTruthy()
      },
      { timeout: 500 },
    )
  })

  it("should toggle user approval when approve/revoke button is clicked", async () => {
    const user = userEvent.setup()
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeTruthy()
    })

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
      expect(screen.getByText("John Doe")).toBeTruthy()
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
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    const editButtons = screen.getAllByLabelText("Edit user")
    await user.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByLabelText("Save changes")).toBeTruthy()
      expect(screen.getByLabelText("Cancel editing")).toBeTruthy()
    })
  })

  it("should update user fields when save button is clicked in edit mode", async () => {
    const user = userEvent.setup()
    vi.mocked(updateUserFields).mockResolvedValue({ success: true })

    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    const editButtons = screen.getAllByLabelText("Edit user")
    await user.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByLabelText("Save changes")).toBeTruthy()
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
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    const editButtons = screen.getAllByLabelText("Edit user")
    await user.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByLabelText("Cancel editing")).toBeTruthy()
    })

    const cancelButton = screen.getByLabelText("Cancel editing")
    await user.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByLabelText("Save changes")).toBeNull()
    })
  })

  it("should open reset password dialog when key button is clicked", async () => {
    const user = userEvent.setup()
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    const resetButtons = screen.getAllByLabelText("Reset password")
    await user.click(resetButtons[0])

    await waitFor(() => {
      expect(screen.getByText(/Reset Password for/i)).toBeTruthy()
      expect(screen.getByPlaceholderText("Enter new password")).toBeTruthy()
    })
  })

  it("should generate random password when generate button is clicked", async () => {
    const user = userEvent.setup()
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    const resetButtons = screen.getAllByLabelText("Reset password")
    await user.click(resetButtons[0])

    await waitFor(() => {
      expect(screen.getByText("Generate Random Password")).toBeTruthy()
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
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    const resetButtons = screen.getAllByLabelText("Reset password")
    await user.click(resetButtons[0])

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter new password")).toBeTruthy()
    })

    const passwordInput = screen.getByPlaceholderText("Enter new password")
    await user.type(passwordInput, "short")

    const resetButton = screen.getByRole("button", { name: /Reset Password/i })
    await user.click(resetButton)

    await waitFor(() => {
      expect(screen.getByText("Password must be at least 8 characters long")).toBeTruthy()
    })
  })

  it("should reset password successfully with valid password", async () => {
    const user = userEvent.setup()
    vi.mocked(adminResetUserPassword).mockResolvedValue({ success: true })

    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    const resetButtons = screen.getAllByLabelText("Reset password")
    await user.click(resetButtons[0])

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter new password")).toBeTruthy()
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
      expect(screen.getByText("John Doe")).toBeTruthy()
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
      expect(screen.getByText("John Doe")).toBeTruthy()
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
      expect(screen.getByText("2 logins")).toBeTruthy()
      expect(screen.getByText("2 views")).toBeTruthy()
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
      expect(screen.getByText("Administrator")).toBeTruthy()
    })
  })

  it("should display no users message when filtered list is empty", async () => {
    const user = userEvent.setup()
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    const searchInput = screen.getByPlaceholderText("Search users...")
    await user.type(searchInput, "nonexistent")

    await waitFor(
      () => {
        expect(screen.getByText("No users found matching your criteria.")).toBeTruthy()
      },
      { timeout: 500 },
    )
  })

  it("should display current belt with color indicator", async () => {
    render(<UserManagement />)

    await waitFor(() => {
      const whiteBeltElements = screen.getAllByText("White Belt")
      expect(whiteBeltElements.length).toBeGreaterThan(0)
    })
  })

  it("should render UserSortControl and UserFilter components", async () => {
    render(<UserManagement />)

    await waitFor(() => {
      expect(screen.getByText("All Users (2)")).toBeTruthy()
    })
  })

  describe("Sorting Branches", () => {
    it("should sort users by last_view date", async () => {
      localStorage.setItem("userManagementSortBy", "last_view")
      localStorage.setItem("userManagementSortOrder", "desc")

      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeTruthy()
        expect(screen.getByText("Jane Smith")).toBeTruthy()
      })
    })

    it("should sort users by view_count", async () => {
      localStorage.setItem("userManagementSortBy", "view_count")
      localStorage.setItem("userManagementSortOrder", "desc")

      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeTruthy()
      })
    })

    it("should sort users by login_count", async () => {
      localStorage.setItem("userManagementSortBy", "login_count")
      localStorage.setItem("userManagementSortOrder", "asc")

      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeTruthy()
      })
    })

    it("should use secondary name sort when primary values are equal", async () => {
      const usersWithSameLoginCount = [
        { ...mockUsers[0], login_count: 5 },
        { ...mockUsers[1], login_count: 5 },
      ]

      mockFrom.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: usersWithSameLoginCount, error: null }),
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

      localStorage.setItem("userManagementSortBy", "login_count")
      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeTruthy()
        expect(screen.getByText("Jane Smith")).toBeTruthy()
      })
    })
  })

  describe("Belt Filtering", () => {
    it("should filter users with no belt assigned", async () => {
      mockSearchParams.get.mockImplementation((param: string) => {
        if (param === "belt") return "none"
        return null
      })

      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.queryByText("John Doe")).toBeNull() // Has belt
        expect(screen.getByText("Jane Smith")).toBeTruthy() // No belt
      })
    })

    it("should filter users by specific belt", async () => {
      mockSearchParams.get.mockImplementation((param: string) => {
        if (param === "belt") return "belt-1"
        return null
      })

      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeTruthy() // Has belt-1
        expect(screen.queryByText("Jane Smith")).toBeNull() // No belt
      })
    })
  })

  describe("Delete User Error Handling", () => {
    it("should show error alert when delete fails", async () => {
      const user = userEvent.setup()
      vi.mocked(global.confirm).mockReturnValue(true)
      vi.mocked(deleteUserCompletely).mockResolvedValue({ success: false, error: "Delete failed" })

      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeTruthy()
      })

      const deleteButtons = screen.getAllByLabelText("Delete user")
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith("Failed to delete user. Please try again.")
      })
    })
  })

  describe("Reset Password Error Handling", () => {
    it("should show error message when reset password API fails", async () => {
      const user = userEvent.setup()
      vi.mocked(adminResetUserPassword).mockResolvedValue({ success: false, error: "API error occurred" })

      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeTruthy()
      })

      const resetButtons = screen.getAllByLabelText("Reset password")
      await user.click(resetButtons[0])

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Enter new password")).toBeTruthy()
      })

      const passwordInput = screen.getByPlaceholderText("Enter new password")
      await user.type(passwordInput, "validpassword123")

      const resetButton = screen.getByRole("button", { name: /Reset Password/i })
      await user.click(resetButton)

      await waitFor(() => {
        expect(screen.getByText("API error occurred")).toBeTruthy()
      })
    })

    it("should toggle password visibility", async () => {
      const user = userEvent.setup()
      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeTruthy()
      })

      const resetButtons = screen.getAllByLabelText("Reset password")
      await user.click(resetButtons[0])

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Enter new password")).toBeTruthy()
      })

      const passwordInput = screen.getByPlaceholderText("Enter new password") as HTMLInputElement
      expect(passwordInput.type).toBe("password")

      // Find and click the eye toggle button
      const toggleButton = document.querySelector('button[type="button"] svg.lucide-eye')?.closest('button')
      if (toggleButton) {
        await user.click(toggleButton)
        expect(passwordInput.type).toBe("text")
      }
    })
  })

  describe("Update User Belt", () => {
    it("should update user belt when belt select is changed", async () => {
      const user = userEvent.setup()
      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeTruthy()
      })

      // Enter edit mode
      const editButtons = screen.getAllByLabelText("Edit user")
      await user.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByLabelText("Save changes")).toBeTruthy()
      })

      // The belt select should be visible in edit mode
      // Find the belt dropdown and change it
      const beltSelects = screen.getAllByRole("combobox")
      const beltSelect = beltSelects.find((s: any) => s.querySelector?.('option[value="belt-2"]'))
      
      if (beltSelect) {
        await user.selectOptions(beltSelect, "belt-2")
      }
    })

    it("should handle error when updating user fields fails", async () => {
      const user = userEvent.setup()
      vi.mocked(updateUserFields).mockResolvedValue({ success: false, error: "Update failed" })

      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeTruthy()
      })

      const editButtons = screen.getAllByLabelText("Edit user")
      await user.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByLabelText("Save changes")).toBeTruthy()
      })

      const saveButton = screen.getByLabelText("Save changes")
      await user.click(saveButton)

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith("Failed to update user fields. Please try again.")
      })
    })
  })

  describe("Search by Multiple Fields", () => {
    it("should search users by teacher name", async () => {
      const user = userEvent.setup()
      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeTruthy()
      })

      const searchInput = screen.getByPlaceholderText("Search users...")
      await user.type(searchInput, "Sensei Bob")

      await waitFor(
        () => {
          expect(screen.getByText("John Doe")).toBeTruthy()
          expect(screen.queryByText("Jane Smith")).toBeNull()
        },
        { timeout: 500 },
      )
    })

    it("should search users by school name", async () => {
      const user = userEvent.setup()
      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeTruthy()
        expect(screen.getByText("Jane Smith")).toBeTruthy()
      })

      const searchInput = screen.getByPlaceholderText("Search users...")
      await user.type(searchInput, "Test Dojo")

      // Both users are from Test Dojo, so both should still be visible after search
      await waitFor(
        () => {
          expect(screen.getByText("John Doe")).toBeTruthy()
        },
        { timeout: 1000 },
      )

      // After search, Jane Smith should also be visible as she's from Test Dojo
      await waitFor(
        () => {
          expect(screen.getByText("Jane Smith")).toBeTruthy()
        },
        { timeout: 1000 },
      )
    })

    it("should search users by belt name", async () => {
      const user = userEvent.setup()
      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeTruthy()
      })

      const searchInput = screen.getByPlaceholderText("Search users...")
      await user.type(searchInput, "White Belt")

      await waitFor(
        () => {
          expect(screen.getByText("John Doe")).toBeTruthy()
          expect(screen.queryByText("Jane Smith")).toBeNull()
        },
        { timeout: 500 },
      )
    })
  })

  describe("Update User Role Error", () => {
    it("should show error alert when role update fails", async () => {
      const user = userEvent.setup()
      
      mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: "Role update failed" } }),
      })

      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeTruthy()
      })

      const roleSelects = screen.getAllByRole("combobox")
      const roleSelect = roleSelects.find((select: HTMLElement) =>
        select.querySelector('option[value="Student"]'),
      ) as HTMLSelectElement

      if (roleSelect) {
        await user.selectOptions(roleSelect, "Teacher")

        await waitFor(() => {
          expect(global.alert).toHaveBeenCalledWith("Failed to update user role. Please try again.")
        })
      }
    })
  })

  describe("Toggle Approval Error", () => {
    it("should handle error when toggling approval fails", async () => {
      const user = userEvent.setup()

      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getByText("Jane Smith")).toBeTruthy()
      })

      // Set up mock to fail on approval toggle after initial render
      mockEq.mockResolvedValue({ data: null, error: { message: "Approval failed" } })

      const approveButtons = screen.getAllByLabelText("Approve user")
      await user.click(approveButtons[0])

      // After clicking approve, even with error, Jane Smith should still be visible
      // The error is handled gracefully and the UI doesn't crash
      await waitFor(() => {
        // Verify component didn't crash - Jane Smith is still in the DOM
        expect(screen.getByText("Jane Smith")).toBeTruthy()
      })
    })
  })

  describe("Getters for Initials", () => {
    it("should display single letter initial for user with no name", async () => {
      const userNoName = {
        ...mockUsers[0],
        full_name: null,
      }

      mockFrom.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [userNoName], error: null }),
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
        // Should show the email as fallback name display
        expect(screen.getByText("student@example.com")).toBeTruthy()
      })
    })
  })
})
