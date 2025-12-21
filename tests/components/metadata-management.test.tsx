import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import MetadataManagement from "@/components/metadata-management"

// Mock the child components
vi.mock("@/components/curriculum-management", () => ({
  default: () => <div>Curriculum Management Component</div>,
}))

vi.mock("@/components/category-management", () => ({
  default: () => <div>Category Management Component</div>,
}))

vi.mock("@/components/performer-management", () => ({
  default: () => <div>Performer Management Component</div>,
}))

describe("MetadataManagement", () => {
  const user = userEvent.setup()

  it("should render the component with title and description", () => {
    render(<MetadataManagement />)
    expect(screen.getByText("Metadata Management")).toBeTruthy()
    expect(screen.getByText("Manage curriculum, categories, and performers")).toBeTruthy()
  })

  it("should render tabs for all three sections", () => {
    render(<MetadataManagement />)
    expect(screen.getByRole("tab", { name: /curriculum/i })).toBeTruthy()
    expect(screen.getByRole("tab", { name: /categories/i })).toBeTruthy()
    expect(screen.getByRole("tab", { name: /performers/i })).toBeTruthy()
  })

  it("should display curriculum tab as active by default", () => {
    render(<MetadataManagement />)
    const curriculumTab = screen.getByRole("tab", { name: /curriculum/i })
    expect(curriculumTab).toHaveAttribute("data-state", "active")
    expect(screen.getByText("Curriculum Management Component")).toBeTruthy()
  })

  it("should display curriculum icon in curriculum tab", () => {
    render(<MetadataManagement />)
    const curriculumTab = screen.getByRole("tab", { name: /curriculum/i })
    const icon = curriculumTab.querySelector("svg")
    expect(icon).toBeTruthy()
  })

  it("should display tags icon in categories tab", () => {
    render(<MetadataManagement />)
    const categoriesTab = screen.getByRole("tab", { name: /categories/i })
    const icon = categoriesTab.querySelector("svg")
    expect(icon).toBeTruthy()
  })

  it("should display users icon in performers tab", () => {
    render(<MetadataManagement />)
    const performersTab = screen.getByRole("tab", { name: /performers/i })
    const icon = performersTab.querySelector("svg")
    expect(icon).toBeTruthy()
  })

  it("should switch to categories tab when clicked", async () => {
    render(<MetadataManagement />)

    const categoriesTab = screen.getByRole("tab", { name: /categories/i })
    await user.click(categoriesTab)

    await waitFor(() => {
      expect(categoriesTab).toHaveAttribute("data-state", "active")
      expect(screen.getByText("Category Management Component")).toBeTruthy()
    })
  })

  it("should switch to performers tab when clicked", async () => {
    render(<MetadataManagement />)

    const performersTab = screen.getByRole("tab", { name: /performers/i })
    await user.click(performersTab)

    await waitFor(() => {
      expect(performersTab).toHaveAttribute("data-state", "active")
      expect(screen.getByText("Performer Management Component")).toBeTruthy()
    })
  })

  it("should maintain active state when switching between tabs", async () => {
    render(<MetadataManagement />)

    const categoriesTab = screen.getByRole("tab", { name: /categories/i })
    const curriculumTab = screen.getByRole("tab", { name: /curriculum/i })

    // Switch to categories
    await user.click(categoriesTab)
    await waitFor(() => {
      expect(categoriesTab).toHaveAttribute("data-state", "active")
    })

    // Switch back to curriculum
    await user.click(curriculumTab)
    await waitFor(() => {
      expect(curriculumTab).toHaveAttribute("data-state", "active")
      expect(screen.getByText("Curriculum Management Component")).toBeTruthy()
    })
  })

  it("should apply correct styling to active tabs", async () => {
    render(<MetadataManagement />)

    const curriculumTab = screen.getByRole("tab", { name: /curriculum/i })
    expect(curriculumTab.className).toContain("data-[state=active]:bg-purple-600")
    expect(curriculumTab.className).toContain("data-[state=active]:text-white")
  })
})
