import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import UserFilter from "@/components/user-filter"

describe("UserFilter", () => {
  const defaultProps = {
    roles: ["Student", "Teacher", "Head Teacher"],
    schools: ["School A", "School B", "School C"],
    belts: [
      { id: "belt-1", name: "White Belt", color: "#ffffff", display_order: 1 },
      { id: "belt-2", name: "Yellow Belt", color: "#ffff00", display_order: 2 },
    ],
    selectedRole: "all",
    selectedSchool: "all",
    selectedBelt: "all",
    onRoleChange: vi.fn(),
    onSchoolChange: vi.fn(),
    onBeltChange: vi.fn(),
    userCount: 25,
  }

  it("should render filter controls", () => {
    render(<UserFilter {...defaultProps} />)

    expect(screen.getByText("Filter by")).toBeTruthy()
    expect(screen.getByText("Role:")).toBeTruthy()
    expect(screen.getByText("School:")).toBeTruthy()
    expect(screen.getByText("Belt:")).toBeTruthy()
  })

  it("should display user count", () => {
    render(<UserFilter {...defaultProps} />)

    expect(screen.getByText(/Showing 25 users/)).toBeTruthy()
  })

  it("should render role select with correct placeholder", () => {
    render(<UserFilter {...defaultProps} />)

    const selects = screen.getAllByRole("combobox")
    expect(selects[0]).toBeTruthy()
    expect(screen.getByText("All Roles")).toBeTruthy()
  })

  it("should render school select with correct placeholder", () => {
    render(<UserFilter {...defaultProps} />)

    const selects = screen.getAllByRole("combobox")
    expect(selects[1]).toBeTruthy()
    expect(screen.getByText("All Schools")).toBeTruthy()
  })

  it("should render belt select with correct placeholder", () => {
    render(<UserFilter {...defaultProps} />)

    const selects = screen.getAllByRole("combobox")
    expect(selects[2]).toBeTruthy()
    expect(screen.getByText("All Belts")).toBeTruthy()
  })

  it("should show Clear All button when filters are active", () => {
    render(<UserFilter {...defaultProps} selectedRole="Teacher" />)

    expect(screen.getByRole("button", { name: /Clear All/i })).toBeTruthy()
  })

  it("should call clear functions when Clear All is clicked", async () => {
    const user = userEvent.setup()
    const onRoleChange = vi.fn()
    const onSchoolChange = vi.fn()
    const onBeltChange = vi.fn()

    render(
      <UserFilter
        {...defaultProps}
        selectedRole="Teacher"
        onRoleChange={onRoleChange}
        onSchoolChange={onSchoolChange}
        onBeltChange={onBeltChange}
      />,
    )

    const clearButton = screen.getByRole("button", { name: /Clear All/i })
    await user.click(clearButton)

    expect(onRoleChange).toHaveBeenCalledWith("all")
    expect(onSchoolChange).toHaveBeenCalledWith("all")
    expect(onBeltChange).toHaveBeenCalledWith("all")
  })

  it("should display active filter badges", () => {
    render(<UserFilter {...defaultProps} selectedRole="Teacher" selectedSchool="School A" />)

    expect(screen.getByText(/Role: Teacher/)).toBeTruthy()
    expect(screen.getByText(/School: School A/)).toBeTruthy()
  })

  it("should remove individual filter when badge is clicked", async () => {
    const user = userEvent.setup()
    const onRoleChange = vi.fn()
    render(<UserFilter {...defaultProps} selectedRole="Teacher" onRoleChange={onRoleChange} />)

    const roleBadge = screen.getByText(/Role: Teacher/).closest(".cursor-pointer")
    await user.click(roleBadge!)

    expect(onRoleChange).toHaveBeenCalledWith("all")
  })

  it("should show filter count in description when filters are active", () => {
    render(<UserFilter {...defaultProps} selectedRole="Teacher" selectedSchool="School A" />)

    expect(screen.getByText(/Showing 25 users matching: 2 filters/)).toBeTruthy()
  })
})
