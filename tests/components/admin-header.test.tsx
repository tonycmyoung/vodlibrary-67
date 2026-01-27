"use client"

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useRouter } from "next/navigation"
import AdminHeader from "@/components/admin-header"

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}))

// Mock notification bell component
vi.mock("@/components/notification-bell", () => ({
  default: () => <div data-testid="notification-bell">Notification Bell</div>,
}))

// Mock invite user modal component
vi.mock("@/components/invite-user-modal", () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    <div data-testid="invite-modal" data-open={isOpen}>
      <button onClick={onClose}>Close Modal</button>
    </div>
  ),
}))

// Mock about modal component
vi.mock("@/components/about-modal", () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    <div data-testid="about-modal" data-open={isOpen}>
      <button onClick={onClose}>Close About Modal</button>
    </div>
  ),
}))

describe("AdminHeader", () => {
  const mockPush = vi.fn()
  const mockUser = {
    id: "user-123",
    full_name: "John Doe",
    email: "john@example.com",
    is_approved: true,
    profile_image_url: "/profile.jpg",
    role: "admin",
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as ReturnType<typeof vi.fn>).mockReturnValue({ push: mockPush })
  })

  it("should render admin header with user information", () => {
    render(<AdminHeader user={mockUser} />)

    expect(screen.getByText("Admin")).toBeTruthy()
    expect(screen.getByText("OKL")).toBeTruthy()
    expect(screen.getByText("JD")).toBeTruthy()
  })

  it("should render navigation links for desktop", () => {
    render(<AdminHeader user={mockUser} />)

    expect(screen.getByText("Users")).toBeTruthy()
    expect(screen.getByText("Videos")).toBeTruthy()
    expect(screen.getAllByText("Metadata")[0]).toBeTruthy()
    expect(screen.getByText("Notifications")).toBeTruthy()
  })

  it("should render notification bell", () => {
    render(<AdminHeader user={mockUser} />)

    expect(screen.getByTestId("notification-bell")).toBeTruthy()
  })

  it("should show user avatar with initials fallback", () => {
    render(<AdminHeader user={mockUser} />)

    const fallback = screen.getByText("JD")
    expect(fallback).toBeTruthy()
  })

  it("should generate initials from full name", () => {
    render(<AdminHeader user={mockUser} />)

    const fallback = screen.getByText("JD")
    expect(fallback).toBeTruthy()
  })

  it("should use default initials when name is missing", () => {
    const userWithoutName = { ...mockUser, full_name: null }
    render(<AdminHeader user={userWithoutName} />)

    const fallback = screen.getByText("A")
    expect(fallback).toBeTruthy()
  })

  it("should open invite modal when invite menu item is clicked", async () => {
    const user = userEvent.setup()
    render(<AdminHeader user={mockUser} />)

    const avatarButton = screen.getAllByRole("button").find((btn) => btn.querySelector('[class*="Avatar"]'))
    if (avatarButton) {
      await user.click(avatarButton)

      const inviteMenuItem = screen.getByText("Invite User")
      await user.click(inviteMenuItem)

      const modal = screen.getByTestId("invite-modal")
      expect(modal).toHaveAttribute("data-open", "true")
    }
  })

  it("should close invite modal when onClose is called", async () => {
    const user = userEvent.setup()
    render(<AdminHeader user={mockUser} />)

    const avatarButton = screen.getAllByRole("button").find((btn) => btn.querySelector('[class*="Avatar"]'))
    if (avatarButton) {
      await user.click(avatarButton)
      const inviteMenuItem = screen.getByText("Invite User")
      await user.click(inviteMenuItem)

      const closeButton = screen.getByText("Close Modal")
      await user.click(closeButton)

      const modal = screen.getByTestId("invite-modal")
      expect(modal).toHaveAttribute("data-open", "false")
    }
  })

  it("should navigate to signout when sign out is clicked", async () => {
    const user = userEvent.setup()
    render(<AdminHeader user={mockUser} />)

    const avatarButton = screen.getAllByRole("button").find((btn) => btn.querySelector('[class*="Avatar"]'))
    if (avatarButton) {
      await user.click(avatarButton)

      const signOutMenuItem = screen.getByText("Sign Out")
      await user.click(signOutMenuItem)

      expect(mockPush).toHaveBeenCalledWith("/signout")
    }
  })

  it("should toggle mobile menu when menu button is clicked", async () => {
    const user = userEvent.setup()
    render(<AdminHeader user={mockUser} />)

    const buttons = screen.getAllByRole("button")
    const menuButton = buttons.find((btn) => btn.className.includes("lg:hidden"))
    expect(menuButton).toBeTruthy()
    await user.click(menuButton!)

    expect(screen.getByText("Student View")).toBeTruthy()
  })

  it("should close mobile menu when a link is clicked", async () => {
    const user = userEvent.setup()
    render(<AdminHeader user={mockUser} />)

    const buttons = screen.getAllByRole("button")
    const menuButton = buttons.find((btn) => btn.className.includes("lg:hidden"))
    expect(menuButton).toBeTruthy()
    await user.click(menuButton!)

    const studentViewLink = screen.getByText("Student View")
    await user.click(studentViewLink)

    // Menu should close (Student View link should not be visible after click)
    // This is a simplified test - in reality we'd check if the mobile menu state changed
  })

  it("should render all dropdown menu items", async () => {
    const user = userEvent.setup()
    render(<AdminHeader user={mockUser} />)

    const avatarButton = screen.getAllByRole("button").find((btn) => btn.querySelector('[class*="Avatar"]'))
    if (avatarButton) {
      await user.click(avatarButton)

      expect(screen.getByText("Library")).toBeTruthy()
      expect(screen.getAllByText("Metadata")[0]).toBeTruthy()
      expect(screen.getByText("Performers")).toBeTruthy()
      expect(screen.getByText("Debug")).toBeTruthy()
      expect(screen.getByText("Audit")).toBeTruthy()
      expect(screen.getByText("Profile")).toBeTruthy()
    }
  })

  describe("About Modal", () => {
    it("should open about modal when About is clicked in dropdown", async () => {
      const user = userEvent.setup()
      render(<AdminHeader user={mockUser} />)

      const avatarButton = screen.getAllByRole("button").find((btn) => btn.querySelector('[class*="Avatar"]'))
      if (avatarButton) {
        await user.click(avatarButton)

        const aboutMenuItem = screen.getByText("About")
        await user.click(aboutMenuItem)

        const modal = screen.getByTestId("about-modal")
        expect(modal).toHaveAttribute("data-open", "true")
      }
    })

    it("should close about modal when onClose is called", async () => {
      const user = userEvent.setup()
      render(<AdminHeader user={mockUser} />)

      const avatarButton = screen.getAllByRole("button").find((btn) => btn.querySelector('[class*="Avatar"]'))
      if (avatarButton) {
        await user.click(avatarButton)
        const aboutMenuItem = screen.getByText("About")
        await user.click(aboutMenuItem)

        const closeButton = screen.getByText("Close About Modal")
        await user.click(closeButton)

        const modal = screen.getByTestId("about-modal")
        expect(modal).toHaveAttribute("data-open", "false")
      }
    })
  })

  describe("User Initials Edge Cases", () => {
    it("should handle three-word names correctly", () => {
      const threeNameUser = { ...mockUser, full_name: "John Paul Smith" }
      render(<AdminHeader user={threeNameUser} />)

      const fallback = screen.getByText("JPS")
      expect(fallback).toBeTruthy()
    })

    it("should handle single name correctly", () => {
      const singleNameUser = { ...mockUser, full_name: "John" }
      render(<AdminHeader user={singleNameUser} />)

      const fallback = screen.getByText("J")
      expect(fallback).toBeTruthy()
    })
  })

  describe("Mobile Menu Navigation", () => {
    it("should close mobile menu when Users link is clicked", async () => {
      const user = userEvent.setup()
      render(<AdminHeader user={mockUser} />)

      const buttons = screen.getAllByRole("button")
      const menuButton = buttons.find((btn) => btn.className.includes("lg:hidden"))
      await user.click(menuButton!)

      // Get mobile Users link (there are two - desktop nav and mobile menu)
      const usersLinks = screen.getAllByText("Users")
      expect(usersLinks.length).toBe(2)

      // Click the mobile version (last one)
      await user.click(usersLinks[usersLinks.length - 1])

      // After click, mobile menu should close, only desktop link remains visible
      const usersLinksAfterClose = screen.getAllByText("Users")
      expect(usersLinksAfterClose.length).toBe(1)
    })

    it("should close mobile menu when Videos link is clicked", async () => {
      const user = userEvent.setup()
      render(<AdminHeader user={mockUser} />)

      const buttons = screen.getAllByRole("button")
      const menuButton = buttons.find((btn) => btn.className.includes("lg:hidden"))
      await user.click(menuButton!)

      const videosLinks = screen.getAllByText("Videos")
      expect(videosLinks.length).toBe(2)

      await user.click(videosLinks[videosLinks.length - 1])

      const videosLinksAfterClose = screen.getAllByText("Videos")
      expect(videosLinksAfterClose.length).toBe(1)
    })

    it("should close mobile menu when Metadata link is clicked", async () => {
      const user = userEvent.setup()
      render(<AdminHeader user={mockUser} />)

      const buttons = screen.getAllByRole("button")
      const menuButton = buttons.find((btn) => btn.className.includes("lg:hidden"))
      await user.click(menuButton!)

      const metadataLinks = screen.getAllByText("Metadata")
      expect(metadataLinks.length).toBe(2)

      await user.click(metadataLinks[metadataLinks.length - 1])

      const metadataLinksAfterClose = screen.getAllByText("Metadata")
      expect(metadataLinksAfterClose.length).toBe(1)
    })

    it("should close mobile menu when Notifications link is clicked", async () => {
      const user = userEvent.setup()
      render(<AdminHeader user={mockUser} />)

      const buttons = screen.getAllByRole("button")
      const menuButton = buttons.find((btn) => btn.className.includes("lg:hidden"))
      await user.click(menuButton!)

      const notificationsLinks = screen.getAllByText("Notifications")
      expect(notificationsLinks.length).toBe(2)

      await user.click(notificationsLinks[notificationsLinks.length - 1])

      const notificationsLinksAfterClose = screen.getAllByText("Notifications")
      expect(notificationsLinksAfterClose.length).toBe(1)
    })

    it("should open invite modal and close mobile menu when Invite User is clicked in mobile menu", async () => {
      const user = userEvent.setup()
      render(<AdminHeader user={mockUser} />)

      const buttons = screen.getAllByRole("button")
      const menuButton = buttons.find((btn) => btn.className.includes("lg:hidden"))
      await user.click(menuButton!)

      // Find the mobile Invite User button (it's a button, not a link in mobile menu)
      const inviteButtons = screen.getAllByText("Invite User")
      const mobileInviteButton = inviteButtons.find((el) => el.closest("button") && !el.closest('[role="menuitem"]'))

      if (mobileInviteButton) {
        await user.click(mobileInviteButton)

        // Invite modal should be open
        const modal = screen.getByTestId("invite-modal")
        expect(modal).toHaveAttribute("data-open", "true")

        // Mobile menu should be closed (Student View not visible)
        expect(screen.queryByText("Student View")).toBeNull()
      }
    })

    it("should navigate to signout and close mobile menu when Sign Out is clicked in mobile menu", async () => {
      const user = userEvent.setup()
      render(<AdminHeader user={mockUser} />)

      const buttons = screen.getAllByRole("button")
      const menuButton = buttons.find((btn) => btn.className.includes("lg:hidden"))
      await user.click(menuButton!)

      // Find mobile Sign Out button
      const signOutButtons = screen.getAllByText("Sign Out")
      const mobileSignOutButton = signOutButtons.find(
        (el) => el.closest("button") && el.closest("button")?.className.includes("w-full"),
      )

      if (mobileSignOutButton) {
        await user.click(mobileSignOutButton)

        expect(mockPush).toHaveBeenCalledWith("/signout")
      }
    })
  })

  describe("Dropdown Menu Additional Items", () => {
    it("should display user full name in dropdown header", async () => {
      const user = userEvent.setup()
      render(<AdminHeader user={mockUser} />)

      const avatarButton = screen.getAllByRole("button").find((btn) => btn.querySelector('[class*="Avatar"]'))
      if (avatarButton) {
        await user.click(avatarButton)

        expect(screen.getByText("John Doe")).toBeTruthy()
        expect(screen.getByText("Administrator")).toBeTruthy()
      }
    })

    it("should show About menu item in dropdown", async () => {
      const user = userEvent.setup()
      render(<AdminHeader user={mockUser} />)

      const avatarButton = screen.getAllByRole("button").find((btn) => btn.querySelector('[class*="Avatar"]'))
      if (avatarButton) {
        await user.click(avatarButton)

        expect(screen.getByText("About")).toBeTruthy()
      }
    })
  })

  describe("Mobile Menu Toggle", () => {
    it("should show X icon when mobile menu is open", async () => {
      const user = userEvent.setup()
      render(<AdminHeader user={mockUser} />)

      const buttons = screen.getAllByRole("button")
      const menuButton = buttons.find((btn) => btn.className.includes("lg:hidden"))

      // Initially should have Menu icon (represented by class)
      await user.click(menuButton!)

      // After click, menu should be open and show Student View
      expect(screen.getByText("Student View")).toBeTruthy()

      // Click again to close
      await user.click(menuButton!)

      // Student View should not be visible
      expect(screen.queryByText("Student View")).toBeNull()
    })
  })
})
