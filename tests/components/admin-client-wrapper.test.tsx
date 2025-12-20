"use client"

import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import AdminClientWrapper from "@/components/admin-client-wrapper"

// Mock the child components
vi.mock("@/components/admin-stats", () => ({
  default: vi.fn(() => <div data-testid="admin-stats">Admin Stats</div>),
}))

vi.mock("@/components/pending-users", () => ({
  default: vi.fn(() => <div data-testid="pending-users">Pending Users</div>),
}))

vi.mock("@/components/unconfirmed-email-users", () => ({
  default: vi.fn(() => <div data-testid="unconfirmed-email-users">Unconfirmed Email Users</div>),
}))

vi.mock("@/components/admin-refresh-button", () => ({
  default: vi.fn(({ onRefresh }) => (
    <button data-testid="refresh-button" onClick={onRefresh}>
      Refresh
    </button>
  )),
}))

describe("AdminClientWrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render dashboard title", () => {
    render(<AdminClientWrapper />)

    expect(screen.getByText("Admin Dashboard")).toBeInTheDocument()
  })

  it("should render all child components", () => {
    render(<AdminClientWrapper />)

    expect(screen.getByTestId("admin-stats")).toBeInTheDocument()
    expect(screen.getByTestId("pending-users")).toBeInTheDocument()
    expect(screen.getByTestId("unconfirmed-email-users")).toBeInTheDocument()
  })

  it("should render refresh button", () => {
    render(<AdminClientWrapper />)

    expect(screen.getByTestId("refresh-button")).toBeInTheDocument()
  })

  it("should apply proper grid layout classes", () => {
    const { container } = render(<AdminClientWrapper />)

    const gridContainer = container.querySelector(".grid.grid-cols-1.lg\\:grid-cols-2")
    expect(gridContainer).toBeInTheDocument()
  })

  it("should apply background gradient classes", () => {
    const { container } = render(<AdminClientWrapper />)

    const mainContainer = container.querySelector(".bg-gradient-to-br.from-gray-900")
    expect(mainContainer).toBeInTheDocument()
  })
})
