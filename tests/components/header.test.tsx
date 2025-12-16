import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
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

    expect(screen.getByText("Okinawa Kobudo")).toBeInTheDocument()
    expect(screen.getByText("Training Video Library")).toBeInTheDocument()
  })

  it("should render navigation links for student", () => {
    render(<Header user={mockUser} />)

    expect(screen.getByText("Library")).toBeInTheDocument()
    expect(screen.getByText("My Level")).toBeInTheDocument()
    expect(screen.getByText("Favorites")).toBeInTheDocument()
  })

  it("should not render My Level link when user has no belt", () => {
    const userWithoutBelt = { ...mockUser, current_belt: null }
    render(<Header user={userWithoutBelt} />)

    expect(screen.queryByText("My Level")).not.toBeInTheDocument()
  })

  it("should render Students link for teachers", () => {
    const teacherUser = { ...mockUser, role: "Teacher" }
    render(<Header user={teacherUser} />)

    expect(screen.getByText("Students")).toBeInTheDocument()
  })

  it("should render Students link for head teachers", () => {
    const headTeacherUser = { ...mockUser, role: "Head Teacher" }
    render(<Header user={headTeacherUser} />)

    expect(screen.getByText("Students")).toBeInTheDocument()
  })

  it("should not render Students link for regular students", () => {
    render(<Header user={mockUser} />)

    expect(screen.queryByText("Students")).not.toBeInTheDocument()
  })

  it("should render user avatar with initials", () => {
    render(<Header user={mockUser} />)

    const avatar = screen.getByText("JD")
    expect(avatar).toBeInTheDocument()
  })

  it("should render notification bell", () => {
    render(<Header user={mockUser} />)

    expect(screen.getByTestId("notification-bell")).toBeInTheDocument()
  })

  it("should open user dropdown menu when avatar is clicked", () => {
    render(<Header user={mockUser} />)

    const avatarButton = screen.getByRole("button", { name: "" })
    fireEvent.click(avatarButton)

    expect(screen.getByText("Profile")).toBeInTheDocument()
    expect(screen.getByText("Curriculum")).toBeInTheDocument()
    expect(screen.getByText("Contribute")).toBeInTheDocument()
    expect(screen.getByText("Donate")).toBeInTheDocument()
    expect(screen.getByText("Contact Admin")).toBeInTheDocument()
    expect(screen.getByText("Change Password")).toBeInTheDocument()
    expect(screen.getByText("Sign Out")).toBeInTheDocument()
  })

  it("should show Invite User option for teachers in dropdown", () => {
    const teacherUser = { ...mockUser, role: "Teacher" }
    render(<Header user={teacherUser} />)

    const avatarButton = screen.getByRole("button", { name: "" })
    fireEvent.click(avatarButton)

    expect(screen.getByText("Invite User")).toBeInTheDocument()
  })

  it("should not show Invite User option for students in dropdown", () => {
    render(<Header user={mockUser} />)

    const avatarButton = screen.getByRole("button", { name: "" })
    fireEvent.click(avatarButton)

    expect(screen.queryByText("Invite User")).not.toBeInTheDocument()
  })

  it("should open invite modal when Invite User is clicked", () => {
    const teacherUser = { ...mockUser, role: "Teacher" }
    render(<Header user={teacherUser} />)

    const avatarButton = screen.getByRole("button", { name: "" })
    fireEvent.click(avatarButton)

    const inviteButton = screen.getByText("Invite User")
    fireEvent.click(inviteButton)

    expect(screen.getByTestId("invite-modal")).toBeInTheDocument()
  })

  it("should open donation modal when Donate is clicked", () => {
    render(<Header user={mockUser} />)

    const avatarButton = screen.getByRole("button", { name: "" })
    fireEvent.click(avatarButton)

    const donateButton = screen.getByText("Donate")
    fireEvent.click(donateButton)

    expect(screen.getByTestId("donation-modal")).toBeInTheDocument()
  })

  it("should open curriculum modal when Curriculum is clicked", () => {
    render(<Header user={mockUser} />)

    const avatarButton = screen.getByRole("button", { name: "" })
    fireEvent.click(avatarButton)

    const curriculumButton = screen.getByText("Curriculum")
    fireEvent.click(curriculumButton)

    expect(screen.getByTestId("curriculum-modal")).toBeInTheDocument()
  })

  it("should open contribute modal when Contribute is clicked", () => {
    render(<Header user={mockUser} />)

    const avatarButton = screen.getByRole("button", { name: "" })
    fireEvent.click(avatarButton)

    const contributeButton = screen.getByText("Contribute")
    fireEvent.click(contributeButton)

    expect(screen.getByTestId("contribute-modal")).toBeInTheDocument()
  })

  it("should toggle mobile menu when hamburger is clicked", () => {
    render(<Header user={mockUser} />)

    const hamburgerButton = screen.getByRole("button", { name: "" })
    fireEvent.click(hamburgerButton)

    // Mobile menu should now be visible with navigation links
    const mobileNav = screen.getAllByText("Library")
    expect(mobileNav.length).toBeGreaterThan(1) // Both desktop and mobile versions
  })
})
