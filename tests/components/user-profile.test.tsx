import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import UserProfile from "@/components/user-profile"
import { updateProfile } from "@/lib/actions"
import { useRouter } from "next/navigation"

vi.mock("@/lib/actions", () => ({
  updateProfile: vi.fn(),
}))

vi.mock("@/lib/actions/users", () => ({
  updateUserBelt: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}))

global.fetch = vi.fn()
global.alert = vi.fn()

describe("UserProfile", () => {
  const mockRouter = {
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }

  const mockUser = {
    id: "user-1",
    email: "test@example.com",
    full_name: "John Doe",
    teacher: "Sensei Bob",
    school: "Test Dojo",
    role: "Student",
    created_at: "2024-01-01T00:00:00Z",
    profile_image_url: "https://example.com/image.jpg",
    favorite_count: 5,
    current_belt_id: "belt-1",
    current_belt: {
      id: "belt-1",
      name: "White Belt",
      color: "#ffffff",
      display_order: 1,
    },
  }

  const mockCurriculums = [
    { id: "belt-1", name: "White Belt", color: "#ffffff", display_order: 1 },
    { id: "belt-2", name: "Yellow Belt", color: "#ffff00", display_order: 2 },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue(mockRouter as any)
    vi.mocked(updateProfile).mockResolvedValue({ success: true })
  })

  it("should render user profile information", () => {
    render(<UserProfile user={mockUser} curriculums={mockCurriculums} />)

    expect(screen.getByText("John Doe")).toBeTruthy()
    expect(screen.getAllByText("test@example.com")[0]).toBeTruthy()
    expect(screen.getByText("Sensei Bob")).toBeTruthy()
    expect(screen.getByText("Test Dojo")).toBeTruthy()
  })

  it("should display favorite count and member since date", () => {
    render(<UserProfile user={mockUser} curriculums={mockCurriculums} />)

    expect(screen.getByText("5")).toBeTruthy()
    expect(screen.getByText(/Member Since/i)).toBeTruthy()
  })

  it("should render quick action buttons", () => {
    render(<UserProfile user={mockUser} curriculums={mockCurriculums} />)

    expect(screen.getByText("View My Favorites")).toBeTruthy()
    expect(screen.getByText("Change Password")).toBeTruthy()
    expect(screen.getByText("Browse Video Library")).toBeTruthy()
  })

  it("should enter edit mode when Edit Profile button is clicked", async () => {
    const user = userEvent.setup()
    render(<UserProfile user={mockUser} curriculums={mockCurriculums} />)

    const editButton = screen.getByRole("button", { name: /edit profile/i })
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /cancel/i })).toBeTruthy()
      expect(screen.getByRole("button", { name: /save/i })).toBeTruthy()
    })
  })

  it("should update full name input when in edit mode", async () => {
    const user = userEvent.setup()
    render(<UserProfile user={mockUser} curriculums={mockCurriculums} />)

    const editButton = screen.getByRole("button", { name: /edit profile/i })
    await user.click(editButton)

    const nameInput = screen.getByDisplayValue("John Doe")
    await user.clear(nameInput)
    await user.type(nameInput, "Jane Doe")

    expect(nameInput).toHaveValue("Jane Doe")
  })

  it("should save profile changes when Save button is clicked", async () => {
    const user = userEvent.setup()
    render(<UserProfile user={mockUser} curriculums={mockCurriculums} />)

    const editButton = screen.getByRole("button", { name: /edit profile/i })
    await user.click(editButton)

    const nameInput = screen.getByDisplayValue("John Doe")
    await user.clear(nameInput)
    await user.type(nameInput, "Jane Doe")

    const saveButton = screen.getByRole("button", { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        userId: "user-1",
        email: "test@example.com",
        fullName: "Jane Doe",
        profileImageUrl: "https://example.com/image.jpg",
      })
      expect(mockRouter.refresh).toHaveBeenCalled()
    })
  })

  it("should cancel edit mode when Cancel button is clicked", async () => {
    const user = userEvent.setup()
    render(<UserProfile user={mockUser} curriculums={mockCurriculums} />)

    const editButton = screen.getByRole("button", { name: /edit profile/i })
    await user.click(editButton)

    const cancelButton = screen.getByRole("button", { name: /cancel/i })
    await user.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /save/i })).toBeNull()
      expect(screen.getByRole("button", { name: /edit profile/i })).toBeTruthy()
    })
  })

  it("should show error alert when profile update fails", async () => {
    const user = userEvent.setup()
    vi.mocked(updateProfile).mockResolvedValue({ success: false, error: "Update failed" })

    render(<UserProfile user={mockUser} curriculums={mockCurriculums} />)

    const editButton = screen.getByRole("button", { name: /edit profile/i })
    await user.click(editButton)

    const saveButton = screen.getByRole("button", { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Failed to update profile. Please try again.")
    })
  })

  it("should display administrator badge for admin users", () => {
    const adminUser = { ...mockUser, isAdmin: true }
    render(<UserProfile user={adminUser} curriculums={mockCurriculums} />)

    expect(screen.getByText("Administrator")).toBeTruthy()
  })

  it("should display teacher badge for teacher role", () => {
    const teacherUser = { ...mockUser, role: "Teacher" }
    render(<UserProfile user={teacherUser} curriculums={mockCurriculums} />)

    const teacherBadges = screen.getAllByText(/Teacher/i)
    expect(teacherBadges.length).toBeGreaterThan(0)
  })

  it("should show current belt with color indicator", () => {
    render(<UserProfile user={mockUser} curriculums={mockCurriculums} />)

    expect(screen.getByText("White Belt")).toBeTruthy()
  })

  it("should show belt select dropdown with all curriculum options", () => {
    render(<UserProfile user={mockUser} curriculums={mockCurriculums} />)

    expect(screen.getByText("White Belt")).toBeTruthy()
  })

  it("should show placeholder text when user data is missing", () => {
    const incompleteUser = {
      ...mockUser,
      full_name: null,
      teacher: null,
      school: null,
      current_belt_id: null,
      current_belt: null,
    }
    render(<UserProfile user={incompleteUser} curriculums={mockCurriculums} />)

    expect(screen.getByText("No name set")).toBeTruthy()
    expect(screen.getByText("Not specified")).toBeTruthy()
  })
})
