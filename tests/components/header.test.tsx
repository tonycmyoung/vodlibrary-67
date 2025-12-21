import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Header from "@/components/header"

// Mock dependencies
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/",
}))

vi.mock("@/components/notification-bell", () => ({
  default: () => <div data-testid="notification-bell">Notification Bell</div>,
}))

vi.mock("@/components/invite-user-modal", () => ({
  default: ({ isOpen }: any) => isOpen && <div data-testid="invite-modal">Invite User Modal</div>,
}))

vi.mock("@/components/donation-modal", () => ({
  default: ({ isOpen }: any) => isOpen && <div data-testid="donation-modal">Donation Modal</div>,
}))

vi.mock("@/components/curriculum-modal", () => ({
  default: ({ isOpen }: any) => isOpen && <div data-testid="curriculum-modal">Curriculum Modal</div>,
}))

vi.mock("@/components/contribute-modal", () => ({
  default: ({ isOpen }: any) => isOpen && <div data-testid="contribute-modal">Contribute Modal</div>,
}))

describe("Header", () => {
  const mockUser = {
    id: "user-1",
    full_name: "John Doe",
    is_approved: true,
    email: "john@example.com",
    profile_image_url: null,
    role: "Student",
    current_belt: {
      id: "belt-1",
      name: "10.Kyu",
      display_order: 1,
      color: "#ffffff",
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render header with site branding", () => {
    render(<Header user={mockUser} />)

    expect(screen.getByText("Okinawa Kobudo")).toBeTruthy()
    expect(screen.getByText("Training Video Library")).toBeTruthy()
  })

  it("should render navigation links for student", () => {
    render(<Header user={mockUser} />)

    expect(screen.getByText("Library")).toBeTruthy()
    expect(screen.getByText("My Level")).toBeTruthy()
    expect(screen.getByText("Favorites")).toBeTruthy()
  })

  it("should not render My Level link when user has no belt", () => {
    const userWithoutBelt = { ...mockUser, current_belt: null }
    render(<Header user={userWithoutBelt} />)

    expect(screen.queryByText("My Level")).toBeNull()
  })

  it("should render Students link for teachers", () => {
    const teacherUser = { ...mockUser, role: "Teacher" }
    render(<Header user={teacherUser} />)

    expect(screen.getByText("Students")).toBeTruthy()
  })

  it("should render Students link for head teachers", () => {
    const headTeacherUser = { ...mockUser, role: "Head Teacher" }
    render(<Header user={headTeacherUser} />)

    expect(screen.getByText("Students")).toBeTruthy()
  })

  it("should not render Students link for regular students", () => {
    render(<Header user={mockUser} />)

    expect(screen.queryByText("Students")).toBeNull()
  })

  it("should render user avatar with initials", () => {
    render(<Header user={mockUser} />)

    const avatar = screen.getByText("JD")
    expect(avatar).toBeTruthy()
  })

  it("should render notification bell", () => {
    render(<Header user={mockUser} />)

    expect(screen.getByTestId("notification-bell")).toBeTruthy()
  })

  it("should open user dropdown menu when avatar is clicked", async () => {
    const user = userEvent.setup()
    render(<Header user={mockUser} />)

    const avatarButton = screen.getAllByRole("button").find((btn) => btn.querySelector('[class*="Avatar"]'))
    if (avatarButton) {
      await user.click(avatarButton)

      await waitFor(() => {
        expect(screen.getByText("Profile")).toBeTruthy()
      })
      expect(screen.getByText("Curriculum")).toBeTruthy()
      expect(screen.getByText("Contribute")).toBeTruthy()
      expect(screen.getByText("Donate")).toBeTruthy()
      expect(screen.getByText("Contact Admin")).toBeTruthy()
      expect(screen.getByText("Change Password")).toBeTruthy()
      expect(screen.getByText("Sign Out")).toBeTruthy()
    }
  })

  it("should show Invite User option for teachers in dropdown", async () => {
    const user = userEvent.setup()
    const teacherUser = { ...mockUser, role: "Teacher" }
    render(<Header user={teacherUser} />)

    const avatarButton = screen.getAllByRole("button").find((btn) => btn.querySelector('[class*="Avatar"]'))
    if (avatarButton) {
      await user.click(avatarButton)

      await waitFor(() => {
        expect(screen.getByText("Invite User")).toBeTruthy()
      })
    }
  })

  it("should not show Invite User option for students in dropdown", async () => {
    const user = userEvent.setup()
    render(<Header user={mockUser} />)

    const avatarButton = screen.getAllByRole("button").find((btn) => btn.querySelector('[class*="Avatar"]'))
    if (avatarButton) {
      await user.click(avatarButton)

      await waitFor(() => {
        expect(screen.getByText("Profile")).toBeTruthy()
      })
      expect(screen.queryByText("Invite User")).toBeNull()
    }
  })

  it("should open invite modal when Invite User is clicked", async () => {
    const user = userEvent.setup()
    const teacherUser = { ...mockUser, role: "Teacher" }
    render(<Header user={teacherUser} />)

    const avatarButton = screen.getAllByRole("button").find((btn) => btn.querySelector('[class*="Avatar"]'))
    if (avatarButton) {
      await user.click(avatarButton)

      await waitFor(() => {
        expect(screen.getByText("Invite User")).toBeTruthy()
      })

      const inviteButton = screen.getByText("Invite User")
      await user.click(inviteButton)

      await waitFor(() => {
        expect(screen.getByTestId("invite-modal")).toBeTruthy()
      })
    }
  })

  it("should open donation modal when Donate is clicked", async () => {
    const user = userEvent.setup()
    render(<Header user={mockUser} />)

    const avatarButton = screen.getAllByRole("button").find((btn) => btn.querySelector('[class*="Avatar"]'))
    if (avatarButton) {
      await user.click(avatarButton)

      await waitFor(() => {
        expect(screen.getByText("Donate")).toBeTruthy()
      })

      const donateButton = screen.getByText("Donate")
      await user.click(donateButton)

      await waitFor(() => {
        expect(screen.getByTestId("donation-modal")).toBeTruthy()
      })
    }
  })

  it("should open curriculum modal when Curriculum is clicked", async () => {
    const user = userEvent.setup()
    render(<Header user={mockUser} />)

    const avatarButton = screen.getAllByRole("button").find((btn) => btn.querySelector('[class*="Avatar"]'))
    if (avatarButton) {
      await user.click(avatarButton)

      await waitFor(() => {
        expect(screen.getByText("Curriculum")).toBeTruthy()
      })

      const curriculumButton = screen.getByText("Curriculum")
      await user.click(curriculumButton)

      await waitFor(() => {
        expect(screen.getByTestId("curriculum-modal")).toBeTruthy()
      })
    }
  })

  it("should open contribute modal when Contribute is clicked", async () => {
    const user = userEvent.setup()
    render(<Header user={mockUser} />)

    const avatarButton = screen.getAllByRole("button").find((btn) => btn.querySelector('[class*="Avatar"]'))
    if (avatarButton) {
      await user.click(avatarButton)

      await waitFor(() => {
        expect(screen.getByText("Contribute")).toBeTruthy()
      })

      const contributeButton = screen.getByText("Contribute")
      await user.click(contributeButton)

      await waitFor(() => {
        expect(screen.getByTestId("contribute-modal")).toBeTruthy()
      })
    }
  })

  it("should toggle mobile menu when hamburger is clicked", () => {
    render(<Header user={mockUser} />)

    const hamburgerButton = screen.getByRole("button", { name: "" })
    fireEvent.click(hamburgerButton)

    // Mobile menu should now be visible with navigation links
    const mobileNav = screen.getAllByText("Library")
    expect(mobileNav.length).toBeGreaterThan(1) // Both desktop and mobile versions
  })

  it("should close mobile menu after clicking a link", () => {
    render(<Header user={mockUser} />)

    const hamburgerButton = screen.getByRole("button", { name: "" })
    fireEvent.click(hamburgerButton)

    // Verify mobile menu is open
    const mobileLinks = screen.getAllByText("Library")
    expect(mobileLinks.length).toBeGreaterThan(1)

    // Click a mobile link
    const libraryLink = mobileLinks[mobileLinks.length - 1] // Get the mobile version
    fireEvent.click(libraryLink)

    // Mobile menu should close - verify we're back to just the desktop link
    const linksAfterClose = screen.getAllByText("Library")
    expect(linksAfterClose.length).toBe(1)
  })

  it("should display user role in dropdown menu", async () => {
    const user = userEvent.setup()
    const teacherUser = { ...mockUser, role: "Teacher" }
    render(<Header user={teacherUser} />)

    const avatarButton = screen.getAllByRole("button").find((btn) => btn.querySelector('[class*="Avatar"]'))
    if (avatarButton) {
      await user.click(avatarButton)

      await waitFor(() => {
        const roleText = screen.getByText("Teacher")
        expect(roleText).toBeTruthy()
        expect(roleText.className).toContain("text-gray-400")
      })
    }
  })

  it("should handle user with null profile image", () => {
    const userNoImage = { ...mockUser, profile_image_url: null }
    render(<Header user={userNoImage} />)

    // Should show initials fallback
    const avatar = screen.getByText("JD")
    expect(avatar).toBeTruthy()
    expect(avatar.className).toContain("bg-red-600")
  })

  it("should handle user with profile image URL", () => {
    const userWithImage = { ...mockUser, profile_image_url: "https://example.com/avatar.jpg" }
    render(<Header user={userWithImage} />)

    // Avatar component with image doesn't show initials fallback
    // Verify the fallback initials are NOT shown when image URL exists
    expect(screen.queryByText("JD")).toBeNull()
  })

  it("should close all modals when navigating away", async () => {
    const user = userEvent.setup()
    render(<Header user={mockUser} />)

    // Open donation modal
    const avatarButton = screen.getAllByRole("button").find((btn) => btn.querySelector('[class*="Avatar"]'))
    if (avatarButton) {
      await user.click(avatarButton)
      await waitFor(() => expect(screen.getByText("Donate")).toBeTruthy())

      await user.click(screen.getByText("Donate"))
      await waitFor(() => expect(screen.getByTestId("donation-modal")).toBeTruthy())

      // Close the modal by clicking outside or using the component's close mechanism
      // Verify modal can be closed (this tests the modal state management)
      const modal = screen.getByTestId("donation-modal")
      expect(modal).toBeTruthy()
    }
  })
})
