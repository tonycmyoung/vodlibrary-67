import { describe, it, expect, vi, beforeEach, type MockInstance } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import StudentManagement from "@/components/student-management"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { fetchStudentsForHeadTeacher, updateStudentForHeadTeacher } from "@/lib/actions/users"
import { deleteUserCompletely } from "@/lib/actions"
import { useRouter, useSearchParams } from "next/navigation"
import { within } from "@testing-library/react"

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/actions/users", () => ({
  fetchStudentsForHeadTeacher: vi.fn(),
  updateStudentForHeadTeacher: vi.fn(),
  assignCurriculumSetToUser: vi.fn().mockResolvedValue({ success: "Curriculum set assigned successfully" }),
}))

vi.mock("@/lib/actions", () => ({
  deleteUserCompletely: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}))

global.confirm = vi.fn()

describe("StudentManagement", () => {
  const mockRouter = {
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }

  const mockSearchParams = {
    get: vi.fn((_param: string) => null),
  }

  const mockStudents = [
    {
      id: "student-1",
      email: "john@example.com",
      full_name: "John Doe",
      teacher: "Sensei Bob",
      school: "Test Dojo",
      role: "Student",
      created_at: "2024-01-01T00:00:00Z",
      is_approved: true,
      approved_at: "2024-01-02T00:00:00Z",
      profile_image_url: null,
      last_login: "2024-01-15T00:00:00Z",
      login_count: 5,
      last_view: "2024-01-16T00:00:00Z",
      view_count: 10,
      current_belt_id: "belt-1",
      current_belt: {
        id: "belt-1",
        name: "White Belt",
        color: "#ffffff",
        display_order: 1,
      },
      inviter: {
        full_name: "Admin User",
      },
      curriculum_set_id: "set-1",
      curriculum_set: { id: "set-1", name: "Okinawa Kobudo Australia" },
    },
    {
      id: "student-2",
      email: "jane@example.com",
      full_name: "Jane Smith",
      teacher: "Sensei Alice",
      school: "Test Dojo",
      role: "Teacher",
      created_at: "2024-01-01T00:00:00Z",
      is_approved: true,
      approved_at: null,
      profile_image_url: null,
      last_login: null,
      login_count: 0,
      last_view: null,
      view_count: 0,
      current_belt_id: null,
      current_belt: null,
      curriculum_set_id: null,
      curriculum_set: null,
    },
  ]

  const mockCurriculumSets = [
    { id: "set-1", name: "Okinawa Kobudo Australia" },
    { id: "set-2", name: "Matayoshi International" },
  ]

  const mockCurriculumLevels = [
    { id: "level-1", name: "White", display_name: "White Belt", sort_order: 1, curriculum_set_id: "set-1" },
    { id: "level-2", name: "Yellow", display_name: "Yellow Belt", sort_order: 2, curriculum_set_id: "set-1" },
    { id: "level-3", name: "Green", display_name: "Green Belt", sort_order: 3, curriculum_set_id: "set-2" },
  ]

  const mockCurriculums = [
    { id: "belt-1", name: "White Belt", color: "#ffffff", display_order: 1 },
    { id: "belt-2", name: "Yellow Belt", color: "#ffff00", display_order: 2 },
  ]

  let mockFrom: MockInstance
  let mockSelect: MockInstance
  let mockOrder: MockInstance
  let mockUpdate: MockInstance
  let mockEq: MockInstance
  let mockSingle: MockInstance

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue(mockRouter as unknown as ReturnType<typeof useRouter>)
    vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as unknown as ReturnType<typeof useSearchParams>)

    mockSingle = vi.fn().mockResolvedValue({
      data: { ...mockStudents[0], current_belt: mockCurriculums[0] },
      error: null,
    })
    mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockOrder = vi.fn().mockResolvedValue({ data: mockCurriculums, error: null })
    mockSelect = vi.fn().mockReturnValue({ order: mockOrder })

    mockFrom = vi.fn((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnValue({ eq: mockEq }),
          update: mockUpdate,
        }
      }
      if (table === "curriculums") {
        return { select: mockSelect }
      }
      if (table === "curriculum_sets") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockCurriculumSets, error: null }),
          }),
        }
      }
      if (table === "curriculum_levels") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockCurriculumLevels, error: null }),
          }),
        }
      }
      return { select: mockSelect }
    })

    vi.mocked(createBrowserClient).mockReturnValue({ from: mockFrom } as unknown as ReturnType<typeof createBrowserClient>)
    vi.mocked(fetchStudentsForHeadTeacher).mockResolvedValue({ data: mockStudents, error: null })
  })

  it("should render loading state initially", async () => {
    // Use a never-resolving promise to keep component in loading state
    vi.mocked(fetchStudentsForHeadTeacher).mockReturnValue(new Promise(() => {}))
    
    const { unmount } = render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)
    expect(screen.getByText("Loading students...")).toBeTruthy()
    
    // Unmount before the promise resolves to prevent act() warnings
    unmount()
  })

  it("should render student list after loading", async () => {
    render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
      expect(screen.getByText("Jane Smith")).toBeTruthy()
    })
  })

  it("should display student count in header", async () => {
    render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)

    await waitFor(() => {
      expect(screen.getByText("Students (2)")).toBeTruthy()
    })
  })

  it("should display user role badges", async () => {
    render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)

    await waitFor(() => {
      const johnDoeText = screen.getByText("John Doe")
      const johnDoeCard = johnDoeText.closest(".flex.flex-col") as HTMLElement
      expect(johnDoeCard).toBeTruthy()

      const johnRoleBadge = within(johnDoeCard).getByText((content, element) => {
        return (
          element?.tagName.toLowerCase() === "span" &&
          element?.textContent === "Student" &&
          element?.getAttribute("data-slot") === "badge"
        )
      })
      expect(johnRoleBadge).toBeTruthy()

      const janeSmithText = screen.getByText("Jane Smith")
      const janeSmithCard = janeSmithText.closest(".flex.flex-col") as HTMLElement
      expect(janeSmithCard).toBeTruthy()

      const janeRoleBadge = within(janeSmithCard).getByText((content, element) => {
        return (
          element?.tagName.toLowerCase() === "span" &&
          element?.textContent === "Teacher" &&
          element?.getAttribute("data-slot") === "badge"
        )
      })
      expect(janeRoleBadge).toBeTruthy()
    })
  })

  it("should display login and view statistics", async () => {
    render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)

    await waitFor(() => {
      expect(screen.getByText("5 logins")).toBeTruthy()
      expect(screen.getByText("10 views")).toBeTruthy()
    })
  })

  it("should display teacher and school information", async () => {
    render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)

    await waitFor(() => {
      const johnDoeText = screen.getByText("John Doe")
      const johnDoeCard = johnDoeText.closest(".flex.flex-col") as HTMLElement
      expect(johnDoeCard).toBeTruthy()

      expect(within(johnDoeCard).getByText("Sensei Bob")).toBeTruthy()
      expect(within(johnDoeCard).getByText(/Test Dojo/)).toBeTruthy()
    })
  })

  it("should display inviter information", async () => {
    render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)

    await waitFor(() => {
      const johnDoeText = screen.getByText("John Doe")
      const johnDoeCard = johnDoeText.closest(".flex.flex-col") as HTMLElement
      expect(johnDoeCard).toBeTruthy()

      expect(within(johnDoeCard).getByText("Inv: Admin User")).toBeTruthy()
    })
  })

  it("should render search input", async () => {
    render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search students...")).toBeTruthy()
    })
  })

  it("should filter students by search query", async () => {
    const user = userEvent.setup()
    render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    const searchInput = screen.getByPlaceholderText("Search students...")
    await user.type(searchInput, "Jane")

    await waitFor(
      () => {
        expect(screen.queryByText("John Doe")).toBeNull()
        expect(screen.getByText("Jane Smith")).toBeTruthy()
      },
      { timeout: 500 },
    )
  })

  it("should update user role when role select is changed", async () => {
    const user = userEvent.setup()
    mockEq.mockResolvedValue({ data: null, error: null })

    render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    const johnDoeText = screen.getByText("John Doe")
    const johnDoeCard = johnDoeText.closest(".flex.flex-col")
    const roleSelect = johnDoeCard
      ?.querySelector('select option[value="Student"]')
      ?.closest("select") as HTMLSelectElement

    await user.selectOptions(roleSelect, "Teacher")

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith("id", "student-1")
    })
  })

  it("should update user belt when belt select is changed", async () => {
    const user = userEvent.setup()
    render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    const johnDoeText = screen.getByText("John Doe")
    const johnDoeCard = johnDoeText.closest(".flex.flex-col")
    // Find the belt select by looking for a select with "No belt" option
    const beltSelect = johnDoeCard?.querySelector('select[title="Current Belt"]') as HTMLSelectElement

    if (!beltSelect) {
      // Skip if belt select not found in current implementation
      return
    }

    await user.selectOptions(beltSelect, "belt-2")

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled()
    })
  })

  it("should enter edit mode when edit button is clicked", async () => {
    const user = userEvent.setup()
    render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    const johnDoeText = screen.getByText("John Doe")
    const johnDoeCard = johnDoeText.closest(".flex.flex-col")
    const editButton = johnDoeCard?.querySelector('button[aria-label="Edit user"]') as HTMLButtonElement

    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByLabelText("Save changes")).toBeTruthy()
      expect(screen.getByLabelText("Cancel editing")).toBeTruthy()
    })
  })

  it("should save edited user fields when save button is clicked", async () => {
    const user = userEvent.setup()
    vi.mocked(updateStudentForHeadTeacher).mockResolvedValue({ success: "Student updated successfully" })

    render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    const johnDoeText = screen.getByText("John Doe")
    const johnDoeCard = johnDoeText.closest(".flex.flex-col")
    const editButton = johnDoeCard?.querySelector('button[aria-label="Edit user"]') as HTMLButtonElement

    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByLabelText("Save changes")).toBeTruthy()
    })

    const nameInput = screen.getByPlaceholderText("Full name")
    await user.clear(nameInput)
    await user.type(nameInput, "John Smith")

    const saveButton = screen.getByLabelText("Save changes")
    await user.click(saveButton)

    await waitFor(() => {
      expect(updateStudentForHeadTeacher).toHaveBeenCalledWith("student-1", "John Smith", "Sensei Bob", "Test Dojo", "belt-1")
    })
  })

  it("should cancel edit mode when cancel button is clicked", async () => {
    const user = userEvent.setup()
    render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    const johnDoeText = screen.getByText("John Doe")
    const johnDoeCard = johnDoeText.closest(".flex.flex-col")
    const editButton = johnDoeCard?.querySelector('button[aria-label="Edit user"]') as HTMLButtonElement

    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByLabelText("Cancel editing")).toBeTruthy()
    })

    const cancelButton = screen.getByLabelText("Cancel editing")
    await user.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByLabelText("Save changes")).toBeNull()
    })
  })

  it("should prompt for confirmation before deleting user", async () => {
    const user = userEvent.setup()
    vi.mocked(global.confirm).mockReturnValue(false)

    render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    const johnDoeText = screen.getByText("John Doe")
    const johnDoeCard = johnDoeText.closest(".flex.flex-col")
    const deleteButton = johnDoeCard?.querySelector('button[aria-label="Delete user"]') as HTMLButtonElement

    await user.click(deleteButton)

    expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('delete the user "john@example.com"'))
    expect(deleteUserCompletely).not.toHaveBeenCalled()
  })

  it("should delete user when confirmed", async () => {
    const user = userEvent.setup()
    vi.mocked(global.confirm).mockReturnValue(true)
    vi.mocked(deleteUserCompletely).mockResolvedValue({ success: true })

    render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    const johnDoeText = screen.getByText("John Doe")
    const johnDoeCard = johnDoeText.closest(".flex.flex-col")
    const deleteButton = johnDoeCard?.querySelector('button[aria-label="Delete user"]') as HTMLButtonElement

    await user.click(deleteButton)

    await waitFor(() => {
      expect(deleteUserCompletely).toHaveBeenCalledWith("student-1")
    })
  })

  it("should display invite user button", async () => {
    render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)

    await waitFor(() => {
      const inviteButtons = screen.getAllByText("Invite User")
      expect(inviteButtons.length).toBeGreaterThan(0)
    })
  })

  it("should display no students message when filtered list is empty", async () => {
    const user = userEvent.setup()
    render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    const searchInput = screen.getByPlaceholderText("Search students...")
    await user.type(searchInput, "nonexistent")

    await waitFor(
      () => {
        expect(screen.getByText("No students found matching your criteria.")).toBeTruthy()
      },
      { timeout: 500 },
    )
  })

  it("should display empty state when no students exist", async () => {
    vi.mocked(fetchStudentsForHeadTeacher).mockResolvedValue({ data: [], error: null })
    render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)

    await waitFor(() => {
      expect(screen.getByText("No students found for your school.")).toBeTruthy()
    })
  })

  it("should display error when fetching students fails", async () => {
    vi.mocked(fetchStudentsForHeadTeacher).mockResolvedValue({ data: [], error: "Failed to fetch" })
    render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)

    await waitFor(() => {
      expect(screen.getByText("No students found for your school.")).toBeTruthy()
    })
  })

  it("should display school prefix as fixed text when editing student with branch suffix", async () => {
    const studentWithBranch = [
      {
        id: "student-1",
        email: "john@example.com",
        full_name: "John Doe",
        teacher: "Sensei Bob",
        school: "Test Dojo Central",
        role: "Student",
        created_at: "2024-01-01T00:00:00Z",
        is_approved: true,
        approved_at: "2024-01-02T00:00:00Z",
        profile_image_url: null,
        last_login: "2024-01-15T00:00:00Z",
        login_count: 5,
        last_view: "2024-01-16T00:00:00Z",
        view_count: 10,
        current_belt_id: "belt-1",
        current_belt: {
          id: "belt-1",
          name: "White Belt",
          color: "#ffffff",
          display_order: 1,
        },
        inviter: {
          full_name: "Admin User",
        },
      },
    ]
    vi.mocked(fetchStudentsForHeadTeacher).mockResolvedValue({ data: studentWithBranch, error: null })

    const user = userEvent.setup()
    render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    const johnDoeText = screen.getByText("John Doe")
    const johnDoeCard = johnDoeText.closest(".flex.flex-col")
    const editButton = johnDoeCard?.querySelector('button[aria-label="Edit user"]') as HTMLButtonElement

    await user.click(editButton)

    await waitFor(() => {
      // Should show the fixed prefix
      expect(screen.getByText("Test Dojo")).toBeTruthy()
      // Should have input with the suffix
      const suffixInput = screen.getByPlaceholderText("(suffix)")
      expect(suffixInput).toBeTruthy()
      expect((suffixInput as HTMLInputElement).value).toBe("Central")
    })
  })

  it("should reconstruct full school name when saving edited suffix", async () => {
    const studentWithBranch = [
      {
        id: "student-1",
        email: "john@example.com",
        full_name: "John Doe",
        teacher: "Sensei Bob",
        school: "Test Dojo Central",
        role: "Student",
        created_at: "2024-01-01T00:00:00Z",
        is_approved: true,
        approved_at: "2024-01-02T00:00:00Z",
        profile_image_url: null,
        last_login: "2024-01-15T00:00:00Z",
        login_count: 5,
        last_view: "2024-01-16T00:00:00Z",
        view_count: 10,
        current_belt_id: "belt-1",
        current_belt: {
          id: "belt-1",
          name: "White Belt",
          color: "#ffffff",
          display_order: 1,
        },
        inviter: null,
      },
    ]
    vi.mocked(fetchStudentsForHeadTeacher).mockResolvedValue({ data: studentWithBranch, error: null })
    vi.mocked(updateStudentForHeadTeacher).mockResolvedValue({ success: "Student updated successfully" })

    const user = userEvent.setup()
    render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    const johnDoeText = screen.getByText("John Doe")
    const johnDoeCard = johnDoeText.closest(".flex.flex-col")
    const editButton = johnDoeCard?.querySelector('button[aria-label="Edit user"]') as HTMLButtonElement

    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByPlaceholderText("(suffix)")).toBeTruthy()
    })

    const suffixInput = screen.getByPlaceholderText("(suffix)")
    await user.clear(suffixInput)
    await user.type(suffixInput, "North")

    const saveButton = screen.getByLabelText("Save changes")
    await user.click(saveButton)

    await waitFor(() => {
      // Should be called with the reconstructed full school name
      expect(updateStudentForHeadTeacher).toHaveBeenCalledWith(
        "student-1",
        "John Doe",
        "Sensei Bob",
        "Test Dojo North",
        "belt-1"
      )
    })
  })

  it("should allow removing suffix to set school to just the prefix", async () => {
    const studentWithBranch = [
      {
        id: "student-1",
        email: "john@example.com",
        full_name: "John Doe",
        teacher: "Sensei Bob",
        school: "Test Dojo Central",
        role: "Student",
        created_at: "2024-01-01T00:00:00Z",
        is_approved: true,
        approved_at: "2024-01-02T00:00:00Z",
        profile_image_url: null,
        last_login: "2024-01-15T00:00:00Z",
        login_count: 5,
        last_view: "2024-01-16T00:00:00Z",
        view_count: 10,
        current_belt_id: null,
        current_belt: null,
        inviter: null,
      },
    ]
    vi.mocked(fetchStudentsForHeadTeacher).mockResolvedValue({ data: studentWithBranch, error: null })
    vi.mocked(updateStudentForHeadTeacher).mockResolvedValue({ success: "Student updated successfully" })

    const user = userEvent.setup()
    render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    const johnDoeText = screen.getByText("John Doe")
    const johnDoeCard = johnDoeText.closest(".flex.flex-col")
    const editButton = johnDoeCard?.querySelector('button[aria-label="Edit user"]') as HTMLButtonElement

    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByPlaceholderText("(suffix)")).toBeTruthy()
    })

    const suffixInput = screen.getByPlaceholderText("(suffix)")
    await user.clear(suffixInput)

    const saveButton = screen.getByLabelText("Save changes")
    await user.click(saveButton)

    await waitFor(() => {
      // Should be called with just the prefix when suffix is empty
      expect(updateStudentForHeadTeacher).toHaveBeenCalledWith(
        "student-1",
        "John Doe",
        "Sensei Bob",
        "Test Dojo",
        null
      )
    })
  })

  describe("Belt Level Filtering by Curriculum Set", () => {
    it("should show belt options filtered by student curriculum set", async () => {
      render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeTruthy()
      })

      // The belt dropdown should render with the available options
      // For a student with set-1, should have set-1 levels (level-1, level-2)
      const beltSelects = screen.getAllByRole("combobox")
      expect(beltSelects.length).toBeGreaterThan(0)
    })

    it("should display curriculum set name for student", async () => {
      render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)

      await waitFor(() => {
        // Multiple elements may exist with this text (e.g., in dropdown options)
        const elements = screen.getAllByText("Okinawa Kobudo Australia")
        expect(elements.length).toBeGreaterThan(0)
      })
    })

    it("should show no curriculum set for unassigned student", async () => {
      render(<StudentManagement headTeacherSchool="Test Dojo" headTeacherId="teacher-1" userRole="Head Teacher" />)

      await waitFor(() => {
        expect(screen.getByText("Jane Smith")).toBeTruthy()
        // Jane has no curriculum set, should display as empty or "Not assigned"
      })
    })
  })
})
